import * as THREE from 'three';
import { Noise } from '../utils/Noise.js';
import { Aerodynamics } from './Aerodynamics.js';
import { Atmosphere } from './Atmosphere.js';
import { PropulsionSolver } from './PropulsionSolver.js';
import { DragSolver } from './DragSolver.js';
import { BrakeSolver } from './BrakeSolver.js';
import { LiftSolver } from './LiftSolver.js';

/**
 * Vector-based flight dynamics.
 *
 * Forces (thrust, lift, drag, gravity) are summed as world-space vectors and
 * integrated with Newton's second law, which gives natural climb/descent,
 * acceleration to a drag-limited terminal speed, and coordinated turns.
 *
 * Rotation uses a rate-command model: the stick commands a body rate up to the
 * aircraft's configured pitchRate/rollRate/yawRate, scaled by control authority
 * (dynamic pressure) and blended with static stability (AoA trim spring and
 * weathervane yaw). A dedicated ground model keeps the aircraft on its wheels,
 * adds rolling/braking friction, and only lets the nose rotate once the
 * aircraft is fast enough to fly.
 *
 * Frame conventions (right-handed, must match the renderer/camera):
 *   local +Z = forward, +Y = up, +X = PORT (pilot's left)
 *   group.rotateX(+) pitches the nose DOWN
 *   group.rotateY(+) yaws the nose LEFT  (toward +X)
 *   group.rotateZ(+) rolls to the RIGHT  (port wingtip rises)
 * So in body rates: nose-up = -X, yaw-right = -Y, roll-right = +Z.
 */
export class FlightPhysicsSolver {
  static noise = new Noise(12345);
  static elevationScale = 0.00015;
  static maxElevation = 700;

  // Handling tunables. These are aircraft-independent shape factors; per-aircraft
  // scaling comes from the JSON config (pitchRate, rollRate, yawRate, pitchGScale, ...).
  static tuning = {
    pitchResponse: 6.0,   // per-second convergence toward the commanded pitch rate
    rollResponse: 8.0,    // ailerons respond fastest
    yawResponse: 3.5,     // rudder responds slowest
    pitchStability: 1.5,  // rad/s of nose-down per rad of AoA above trim
    yawStability: 1.5,    // rad/s of weathervane per rad of sideslip (coordinates turns)
    dihedral: 0.5,        // rad/s of leveling roll per rad of sideslip (lateral stability)
    rollDueToYaw: 0.6,    // rudder's secondary roll: rudder input banks into the yaw
    adverseYaw: 0.12,     // yaw opposite the roll command (needs rudder to coordinate)
    aoaTrim: 0.06         // built-in trim angle of attack (~3.5deg) so hands-off flight sustains lift
  };

  static solve(aircraft, deltaTime) {
    const config = aircraft.config;
    const dt = Math.min(deltaTime, 0.05);
    if (dt <= 0) return;

    if (aircraft.isCrashed) {
      aircraft.velocity.set(0, 0, 0);
      aircraft.angularVelocity.set(0, 0, 0);
      aircraft.airspeed = 0;
      aircraft.indicatedAirspeed = 0;
      aircraft.groundSpeed = 0;
      return;
    }

    const isJet = config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(config.id);

    // --- Body axes -----------------------------------------------------------
    const q = aircraft.group.quaternion;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const port = new THREE.Vector3(1, 0, 0).applyQuaternion(q);

    // --- Environment ---------------------------------------------------------
    const settings = aircraft.engine?.moduleManager?.get('Settings');
    const windEnabled = settings ? settings.enableWind : true;
    const weatherManager = aircraft.engine?.moduleManager?.get('Weather');
    const windVector = (weatherManager && windEnabled) ? weatherManager.wind : new THREE.Vector3(0, 0, 0);
    const gustVector = (weatherManager && windEnabled) ? weatherManager.currentGust : new THREE.Vector3(0, 0, 0);
    const totalWind = windVector.clone().add(gustVector);

    aircraft.altitude = aircraft.position.y;
    const airDensity = Atmosphere.getDensity(aircraft.position.y);
    const speedOfSound = Atmosphere.getSpeedOfSound(aircraft.position.y);
    const seaLevelDensity = 1.225;
    const densityRatio = airDensity / seaLevelDensity;

    const span = config.dimensions.span;
    const length = config.dimensions.length;
    const gearHeight = aircraft.gearRetracted
      ? (config.bellyClearance ?? 0.35)
      : (config.groundClearanceOffset ?? 1.2);
    const waterLevel = 135.0;

    const terrainHeight = FlightPhysicsSolver.getTerrainHeightAt(aircraft.position.x, aircraft.position.z);
    const heightAboveGround = aircraft.position.y - terrainHeight;

    // --- Water impact / sinking ---------------------------------------------
    if (aircraft.isSinking) {
      aircraft.airspeed = THREE.MathUtils.lerp(aircraft.airspeed, 0.0, 5.0 * dt);
      aircraft.indicatedAirspeed = aircraft.airspeed;
      aircraft.velocity.set(forward.x * aircraft.airspeed, -2.5, forward.z * aircraft.airspeed);
      aircraft.position.addScaledVector(aircraft.velocity, dt);
      if (aircraft.position.y < waterLevel - 6.0) {
        aircraft.position.y = waterLevel - 6.0;
        aircraft.velocity.set(0, 0, 0);
        if (!aircraft.isCrashed) {
          aircraft.isCrashed = true;
          console.log('[FlightPhysicsSolver] Splash down complete. Submersion crash triggered.');
        }
      }
      aircraft.group.rotateX(0.4 * dt);
      aircraft.rotation.copy(aircraft.group.rotation);
      aircraft.quaternion.copy(aircraft.group.quaternion);
      aircraft.engineOn = false;
      aircraft.engineSpool = THREE.MathUtils.lerp(aircraft.engineSpool, 0.0, 5.0 * dt);
      aircraft.group.position.copy(aircraft.position);
      return;
    }
    if (aircraft.position.y <= waterLevel + 0.1 && !aircraft.isCrashed) {
      aircraft.isSinking = true;
      console.log('[FlightPhysicsSolver] WATER IMPACT - SINKING PHASE INITIATED');
      return;
    }

    // --- Relative airflow, angle of attack, sideslip -------------------------
    const relVel = aircraft.velocity.clone().sub(totalWind);
    const V = relVel.length();                       // true airspeed magnitude
    const forwardSpeed = relVel.dot(forward);
    const upSpeed = relVel.dot(up);
    const portSpeed = relVel.dot(port);
    const aoaRad = (V > 1.0) ? Math.atan2(-upSpeed, forwardSpeed) : 0.0;
    // Positive sideslip = airflow coming from the port (+X) side.
    const sideslipRad = (V > 1.0) ? Math.atan2(portSpeed, Math.abs(forwardSpeed)) : 0.0;

    // Airspeed reported to the HUD/sound is the forward component (indicated).
    aircraft.airspeed = forwardSpeed;
    aircraft.indicatedAirspeed = Math.max(forwardSpeed, 0) * Math.sqrt(densityRatio);
    const machNumber = V / speedOfSound;

    const currentMass = (config.emptyWeight ?? 800) + aircraft.fuel;
    const weightN = currentMass * 9.81;

    // Ground effect: within one wingspan of the surface, lift improves.
    let geLiftMultiplier = 1.0;
    if (heightAboveGround < span && heightAboveGround >= 0) {
      geLiftMultiplier = 1.0 + 0.20 * (span - heightAboveGround) / span;
    }

    // Flap blowback: above the flap placard speed the airload folds the surfaces'
    // extra lift/drag away, so landing flap at Mach 0.9 does nothing instead of
    // granting full high-lift camber. Shared with the Lift/Drag solvers.
    const flapPlacardIAS = config.flapPlacardIAS ?? 75.0; // m/s indicated (~145 kt)
    const iasNow = V * Math.sqrt(densityRatio);
    aircraft.flapEffectiveness = THREE.MathUtils.clamp(
      (flapPlacardIAS * 1.3 - iasNow) / (flapPlacardIAS * 0.3), 0.0, 1.0);

    // Effective max lift coefficient (with flaps) sets the real stall/rotate speeds.
    const flapsCLBonus = ((aircraft.flapsStage === 1) ? 0.28 : (aircraft.flapsStage === 2 ? 0.55 : 0.0))
      * aircraft.flapEffectiveness;
    const effectiveCLmax = config.liftCoefficientMax + flapsCLBonus;
    const stallSpeed = Math.sqrt((2 * weightN) / (Math.max(airDensity, 0.2) * config.wingArea * effectiveCLmax));
    const rotateSpeed = 0.90 * stallSpeed; // begin raising the nose just below stall speed
    aircraft.stallSpeedTAS = stallSpeed;
    aircraft.stallSpeedIAS = stallSpeed * Math.sqrt(densityRatio);

    // --- Aerodynamic + propulsive forces ------------------------------------
    const thrustMag = PropulsionSolver.solve(aircraft, airDensity, dt);
    const { liftMagnitude, CL } = LiftSolver.solve(aircraft, airDensity, geLiftMultiplier, aoaRad, V, machNumber);
    const dragMag = DragSolver.solve(aircraft, airDensity, CL, speedOfSound, heightAboveGround, dt, V);

    // Everything except gravity goes into aeroForce first, so the felt load
    // factor (what bends wings and blacks out pilots) can be measured from the
    // real acceleration instead of guessed from lift alone.
    const aeroForce = new THREE.Vector3();
    aeroForce.addScaledVector(forward, thrustMag);        // thrust along the nose

    if (V > 0.5) {
      const airflowDir = relVel.clone().multiplyScalar(1 / V);
      // Drag opposes the direction of travel through the air.
      aeroForce.addScaledVector(airflowDir, -dragMag);
      // Lift is perpendicular to the relative airflow, on the wing's "up" side.
      let side = up.clone().cross(airflowDir);
      if (side.lengthSq() < 1e-6) side = port.clone();
      side.normalize();
      const liftDir = airflowDir.clone().cross(side).normalize();
      if (liftDir.dot(up) < 0) liftDir.negate();
      aeroForce.addScaledVector(liftDir, liftMagnitude);

      // Fuselage/fin side force: sideslip pushes the airframe sideways, which is
      // what makes a forward slip actually displace the flight path and gives
      // skidding turns their sag. Airflow arriving from the port side (+beta)
      // shoves the aircraft to starboard (-port).
      const sideForceCoefPerRad = 0.35;
      const qDyn = 0.5 * airDensity * V * V;
      aeroForce.addScaledVector(port, -qDyn * config.wingArea * sideForceCoefPerRad * sideslipRad);
    }

    // Felt load factor: non-gravitational acceleration along the pilot's spine.
    // Reads +1 in level flight, 0 at the top of a pushover, -1 inverted.
    const rawLoadFactor = weightN > 0 ? aeroForce.dot(up) / weightN : 1.0;

    const netForce = aeroForce.clone();
    netForce.y -= weightN;                                // gravity

    const accel = netForce.multiplyScalar(1 / currentMass);
    // Safety clamp so a pathological frame can never launch the aircraft.
    const accelMax = 120.0;
    if (accel.lengthSq() > accelMax * accelMax) accel.setLength(accelMax);

    aircraft.velocity.addScaledVector(accel, dt);

    // --- Integrate position, then resolve ground contact ---------------------
    aircraft.position.addScaledVector(aircraft.velocity, dt);

    const terrainNow = FlightPhysicsSolver.getTerrainHeightAt(aircraft.position.x, aircraft.position.z);
    const restY = terrainNow + gearHeight;
    const wasAirborne = heightAboveGround > (gearHeight + 0.25);
    const onGround = aircraft.position.y <= restY + 0.05;

    let touchdownSink = 0.0;
    if (onGround) {
      touchdownSink = Math.max(-aircraft.velocity.y, 0.0);

      // Weight-on-wheels: the runway supports the aircraft (no sinking through it).
      if (aircraft.position.y < restY) aircraft.position.y = restY;
      if (aircraft.velocity.y < 0) aircraft.velocity.y = 0;

      // Ground friction is directional. Rolling/braking friction opposes motion
      // ALONG the heading, while the tires resist sideways skidding much more
      // strongly (cornering grip) so nosewheel steering actually curves the
      // taxi/takeoff path instead of the aircraft sliding like it's on ice.
      const horizSpeed = Math.hypot(aircraft.velocity.x, aircraft.velocity.z);
      if (horizSpeed > 1e-4) {
        const fwdH = new THREE.Vector3(forward.x, 0, forward.z);
        if (fwdH.lengthSq() > 1e-6) {
          fwdH.normalize();
          const vHoriz = new THREE.Vector3(aircraft.velocity.x, 0, aircraft.velocity.z);
          const vFwd = vHoriz.dot(fwdH);
          const vLat = vHoriz.clone().addScaledVector(fwdH, -vFwd); // sideways skid

          // Along-track: rolling resistance + wheel brakes (or belly drag).
          const decel = BrakeSolver.solve(aircraft, true, dt);
          const newVFwd = Math.sign(vFwd) * Math.max(Math.abs(vFwd) - decel * dt, 0.0);

          // Cross-track: bleed the skid off quickly on wheels, slowly on the belly.
          const lateralGripPerSec = aircraft.gearRetracted ? 1.5 : 7.0;
          vLat.multiplyScalar(Math.max(1.0 - lateralGripPerSec * dt, 0.0));

          const newHoriz = fwdH.multiplyScalar(newVFwd).add(vLat);
          aircraft.velocity.x = newHoriz.x;
          aircraft.velocity.z = newHoriz.z;
        } else {
          const decel = BrakeSolver.solve(aircraft, true, dt);
          const scale = Math.max(horizSpeed - decel * dt, 0.0) / horizSpeed;
          aircraft.velocity.x *= scale;
          aircraft.velocity.z *= scale;
        }
      }
      aircraft.isBellyScraping = aircraft.gearRetracted;
    } else {
      aircraft.isBellyScraping = false;
    }

    // Soft cap on total speed as a stability guard (drag already limits it).
    const terminalSpeed = config.terminalSpeed ?? (isJet ? 180.0 : 60.0);
    const speedCap = terminalSpeed * 1.3;
    if (aircraft.velocity.lengthSq() > speedCap * speedCap) aircraft.velocity.setLength(speedCap);

    aircraft.group.position.copy(aircraft.position);
    aircraft.groundSpeed = Math.hypot(aircraft.velocity.x, aircraft.velocity.z);
    aircraft.verticalSpeed = aircraft.velocity.y;
    aircraft.sinkRate = Math.max(-aircraft.velocity.y, 0.0);

    // --- Collision / crash geometry -----------------------------------------
    const pitchDeg = Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1)) * (180 / Math.PI);
    const bankDeg = Math.abs(aircraft.rotation.z) * (180 / Math.PI);

    const nose = aircraft.position.clone().addScaledVector(forward, length * 0.45);
    const tail = aircraft.position.clone().addScaledVector(forward, -length * 0.45);
    const portTip = aircraft.position.clone().addScaledVector(port, span * 0.48);
    const starboardTip = aircraft.position.clone().addScaledVector(port, -span * 0.48);

    const noseDug = nose.y < FlightPhysicsSolver.getTerrainHeightAt(nose.x, nose.z);
    const tailDug = tail.y < FlightPhysicsSolver.getTerrainHeightAt(tail.x, tail.z);
    const portDug = portTip.y < FlightPhysicsSolver.getTerrainHeightAt(portTip.x, portTip.z);
    const starboardDug = starboardTip.y < FlightPhysicsSolver.getTerrainHeightAt(starboardTip.x, starboardTip.z);

    const obstacleManager = aircraft.engine?.moduleManager?.get('Obstacles');
    const hitObstacle = obstacleManager ? obstacleManager.checkCollision(aircraft) : false;

    // Crash conditions (forgiving: normal runway ops and gentle touchdowns are safe).
    const hardTouchdown = wasAirborne && onGround && touchdownSink > (aircraft.gearRetracted ? 4.5 : 9.0);
    const noseStrike = noseDug && (pitchDeg < -18.0 || touchdownSink > 6.0);
    const tailStrike = tailDug && (pitchDeg > 16.0 || touchdownSink > 6.0);
    const wingStrike = (portDug || starboardDug) && bankDeg > 22.0 && aircraft.groundSpeed > 8.0;

    if (hardTouchdown || noseStrike || tailStrike || wingStrike || hitObstacle) {
      aircraft.isCrashed = true;
      aircraft.engineOn = false;
      aircraft.velocity.set(0, 0, 0);
      aircraft.angularVelocity.set(0, 0, 0);
      aircraft.airspeed = 0;
      aircraft.indicatedAirspeed = 0;
      aircraft.groundSpeed = 0;
      console.log(`[FlightPhysicsSolver] CRASH. hardTouchdown:${hardTouchdown} nose:${noseStrike} tail:${tailStrike} wing:${wingStrike} obstacle:${hitObstacle} sink:${touchdownSink.toFixed(1)}`);
      return;
    }

    // --- Stall / spin state --------------------------------------------------
    const airborne = heightAboveGround > 2.0;
    aircraft.isStalled = airborne && Math.abs(aoaRad) > Aerodynamics.criticalAoA;
    const stallFactor = aircraft.isStalled ? 0.35 : 1.0;

    if (aircraft.isStalled) {
      // A stalled wing drops its nose. Buffet is turbulence-like shaking (from
      // the separated flow beating on the tail), not white noise, and any
      // sideslip makes one wing stall deeper and drop first.
      const tBuffet = performance.now() * 0.004;
      const buffetX = FlightPhysicsSolver.noise.noise2D(tBuffet, 17.3) - 0.5;
      const buffetZ = FlightPhysicsSolver.noise.noise2D(tBuffet, 91.7) - 0.5;
      aircraft.angularVelocity.x += (0.6 + buffetX * 5.0) * dt;
      aircraft.angularVelocity.z += (buffetZ * 5.0 + 1.6 * sideslipRad) * dt;
      if (!aircraft.isSpinning && (Math.abs(aircraft.controls.roll) > 0.5 || Math.abs(aircraft.controls.yaw) > 0.5)) {
        aircraft.isSpinning = true;
        // +1 = spin to the right (matches D / E input direction).
        aircraft.spinDir = Math.sign(aircraft.controls.roll || aircraft.controls.yaw) || 1;
      }
    } else {
      aircraft.isSpinning = false;
    }

    // --- Rotational dynamics (rate-command) ----------------------------------
    aircraft.controls.pitchSmoothed = THREE.MathUtils.lerp(aircraft.controls.pitchSmoothed || 0, aircraft.controls.pitch, 8.0 * dt);
    aircraft.controls.rollSmoothed = THREE.MathUtils.lerp(aircraft.controls.rollSmoothed || 0, aircraft.controls.roll, 8.0 * dt);
    aircraft.controls.yawSmoothed = THREE.MathUtils.lerp(aircraft.controls.yawSmoothed || 0, aircraft.controls.yaw, 8.0 * dt);

    // Pitch trim biases the stick so cruise can fly hands-off (End/Home keys).
    const pitchTrim = aircraft.controls.pitchTrim || 0;
    const pitchCmd = THREE.MathUtils.clamp(aircraft.controls.pitchSmoothed + pitchTrim, -1, 1); // +1 (S / Down) = nose up
    const rollCmd = aircraft.controls.rollSmoothed;   // +1 (D / Right) = bank right
    const yawCmd = aircraft.controls.yawSmoothed;     // +1 (E) = nose right

    const T = FlightPhysicsSolver.tuning;

    // Control effectiveness scales with dynamic pressure: mushy near the stall,
    // full authority above ~1.5x stall speed. A small floor keeps the aircraft
    // recoverable at very low airborne speed.
    const controlSpeed = Math.max(V, 12.0);
    const controlQ = 0.5 * airDensity * controlSpeed * controlSpeed;
    const qFullAuthority = 0.5 * seaLevelDensity * (1.5 * stallSpeed) * (1.5 * stallSpeed);
    let authority = THREE.MathUtils.clamp(controlQ / qFullAuthority, 0.12, 1.0) * stallFactor;

    // F-22 thrust vectoring keeps pitch/yaw authority even at low airspeed.
    let pitchYawAuthority = authority;
    if (config.id === 'f22') {
      const tv = 0.65 * aircraft.controls.throttle * aircraft.engineSpool;
      pitchYawAuthority = Math.max(authority, Math.min(tv, 1.0) * stallFactor);
    }

    // G-limiter part 1 (feedback): nose-up command fades as the measured load
    // factor approaches the airframe limit from the config (pitchGScale).
    const gLimit = config.pitchGScale ?? 6.0;
    let pitchCmdEff = pitchCmd;
    if (pitchCmd > 0 && aircraft.gForce > gLimit - 0.5) {
      pitchCmdEff = pitchCmd * THREE.MathUtils.clamp(gLimit + 0.5 - aircraft.gForce, 0.0, 1.0);
    }

    // Commanded body rates (rad/s). Axis mapping: nose-up = -X, roll-right = +Z, yaw-right = -Y.
    let pitchRateTarget = -pitchCmdEff * config.pitchRate * pitchYawAuthority;
    let rollRateTarget = rollCmd * config.rollRate * authority;
    let yawRateTarget = -yawCmd * config.yawRate * pitchYawAuthority;

    // Static stability, expressed as restoring rates:
    // - pitch: spring toward the trim AoA (gives hands-off lift and stick-free recovery)
    // - yaw: weathervane into the relative wind (coordinates banked turns)
    // - roll (dihedral): a sideslip rolls the aircraft back toward wings-level
    // sideslipRad > 0 means the nose points right of the velocity vector; the
    // aircraft then needs to yaw left (+Y) and roll left (-Z) to recover.
    const stabScale = THREE.MathUtils.clamp(V / 30.0, 0.0, 1.5) * stallFactor;
    const dihedralGain = config.dihedral ?? 1.0; // per-type (flying wings & high-wings are stiffer)
    pitchRateTarget += T.pitchStability * (aoaRad - T.aoaTrim) * stabScale;       // AoA above trim -> nose down (+X)
    // Deploying flaps shifts the center of lift aft, trimming the nose down a touch.
    pitchRateTarget += 0.04 * aircraft.flapsStage * aircraft.flapEffectiveness * stabScale; // +X = nose down
    yawRateTarget += T.yawStability * sideslipRad * stabScale;                    // yaw toward the airflow (+Y = toward +X)
    rollRateTarget += -T.dihedral * dihedralGain * sideslipRad * stabScale;       // lateral stability -> level the wings

    // Rudder's secondary roll effect: applying rudder yaws the aircraft and the
    // advancing (outer) wing makes more lift, banking it INTO the yaw. This is
    // tied to the rudder INPUT rather than the yaw rate, so a coordinated aileron
    // turn (no rudder) doesn't get a destabilizing roll->yaw->roll feedback loop.
    // Rudder-right is yawCmd +1, which should bank right (+Z).
    rollRateTarget += T.rollDueToYaw * yawCmd * config.yawRate * pitchYawAuthority;

    // Adverse yaw: deflecting the ailerons drags the rising wing back, swinging
    // the nose opposite to the roll. Props show it more than jets with spoilers.
    const adverseGain = isJet ? 0.5 : 1.0;
    yawRateTarget += T.adverseYaw * adverseGain * rollCmd * config.rollRate * authority; // roll right (+) -> yaw left (+Y)

    // Propeller left-turning tendencies: engine torque rolls opposite the prop's
    // rotation, and P-factor/spiraling slipstream yaw the nose left, strongest at
    // high power and low airspeed. A touch of right rudder on climb-out fixes it.
    if (!isJet && !onGround) {
      const powerFrac = aircraft.controls.throttle * aircraft.engineSpool;
      // Scaled by thrust-to-weight: a light single feels its engine far more
      // than a heavy four-engine turboprop does.
      const twr = THREE.MathUtils.clamp((config.maxThrust ?? 0) / Math.max(weightN, 1), 0.0, 1.0);
      const lowSpeedFactor = THREE.MathUtils.clamp(45.0 / Math.max(V, 15.0), 0.4, 3.0);
      yawRateTarget += 0.030 * powerFrac * twr * lowSpeedFactor;   // yaw LEFT (+Y)
      rollRateTarget -= 0.018 * powerFrac * twr * lowSpeedFactor;  // roll LEFT (-Z)
    }

    // G-limiter part 2 (command shaping): a steady pitch rate q at speed V pulls
    // roughly n = up_y + q*V/g, so the commanded rate is capped at what the
    // airframe tolerates. This is why real jets feel crisp at low speed but can
    // only creep the nose around at 500 knots.
    if (!onGround) {
      const negGLimit = -Math.max(0.35 * gLimit, 1.0);                 // structural negative-G limit
      const qMaxUp = 9.81 * (gLimit - up.y) / Math.max(V, 20.0);       // nose-up is -X
      const qMaxDown = 9.81 * (up.y - negGLimit) / Math.max(V, 20.0);  // nose-down is +X
      pitchRateTarget = THREE.MathUtils.clamp(pitchRateTarget, -qMaxUp, qMaxDown);
    }

    // Angle-of-attack limiter: fly-by-wire types refuse to command past the
    // stalling angle (the F-16's blended g/AoA limiter). Conventional aircraft
    // get no such protection and will stall if hauled back hard.
    const flyByWire = config.flyByWire ?? ['f16', 'f22', 'f35', 'b2'].includes(config.id);
    if (flyByWire && !onGround && pitchRateTarget < 0) { // negative X = nose up
      const aoaMax = Aerodynamics.criticalAoA * 0.92;
      const aoaRoom = THREE.MathUtils.clamp((aoaMax - aoaRad) / (0.30 * aoaMax), 0.0, 1.0);
      pitchRateTarget *= aoaRoom;
    }

    // Tail-strike protection: near the ground, the commanded nose-up rate fades
    // to zero as pitch approaches the attitude at which the tail would touch
    // the runway at the current height, then relaxes as the aircraft climbs.
    const tailArm = length * 0.45;
    if (pitchRateTarget < 0 && heightAboveGround < tailArm * 1.3) { // negative X = nose up
      const safePitchMax = Math.asin(THREE.MathUtils.clamp((heightAboveGround * 0.85) / tailArm, 0.10, 1.0));
      const pitchRad = Math.asin(THREE.MathUtils.clamp(forward.y, -1, 1));
      const room = THREE.MathUtils.clamp((safePitchMax - pitchRad) / 0.10, 0.0, 1.0);
      pitchRateTarget *= room;
    }

    const respPitch = 1.0 - Math.exp(-T.pitchResponse * dt);
    const respRoll = 1.0 - Math.exp(-T.rollResponse * dt);
    const respYaw = 1.0 - Math.exp(-T.yawResponse * dt);

    if (aircraft.isSpinning) {
      // Fully developed spin: rolling and yawing in the same direction, nose down.
      aircraft.angularVelocity.z = aircraft.spinDir * 3.0;
      aircraft.angularVelocity.y = -aircraft.spinDir * 1.2;
      aircraft.angularVelocity.x = 0.5;
      if (aircraft.controls.pitch < -0.5 && Math.abs(aoaRad) < Aerodynamics.criticalAoA) {
        aircraft.isSpinning = false;
        aircraft.isStalled = false;
      }
    } else if (onGround) {
      // Wings held level on the wheels.
      aircraft.angularVelocity.z = 0;
      // The nose only comes up once we are fast enough to fly.
      aircraft.angularVelocity.x = (forwardSpeed > rotateSpeed)
        ? aircraft.angularVelocity.x + (pitchRateTarget - aircraft.angularVelocity.x) * respPitch
        : THREE.MathUtils.lerp(aircraft.angularVelocity.x, 0, 10.0 * dt);
      // Nosewheel/rudder steering: effective from taxi speed, tapering at speed.
      if (Math.abs(forwardSpeed) > 0.5) {
        const steerGrip = THREE.MathUtils.clamp(forwardSpeed / 8.0, 0, 1)
          * THREE.MathUtils.clamp(1.4 - forwardSpeed / 60.0, 0.35, 1.0);
        aircraft.angularVelocity.y = -yawCmd * config.yawRate * steerGrip;
      } else {
        aircraft.angularVelocity.y = 0;
      }
    } else {
      aircraft.angularVelocity.x += (pitchRateTarget - aircraft.angularVelocity.x) * respPitch;
      aircraft.angularVelocity.y += (yawRateTarget - aircraft.angularVelocity.y) * respYaw;
      aircraft.angularVelocity.z += (rollRateTarget - aircraft.angularVelocity.z) * respRoll;

      // Transonic "mach tuck": a gentle nose-down bias through the transonic band.
      if (isJet && machNumber > 0.90 && machNumber < 1.25) {
        aircraft.angularVelocity.x += 0.30 * Math.sin((machNumber - 0.90) * Math.PI / 0.35) * dt;
      }
    }

    aircraft.angularVelocity.x = THREE.MathUtils.clamp(aircraft.angularVelocity.x, -3.0, 3.0);
    aircraft.angularVelocity.y = THREE.MathUtils.clamp(aircraft.angularVelocity.y, -2.0, 2.0);
    aircraft.angularVelocity.z = THREE.MathUtils.clamp(aircraft.angularVelocity.z, -4.0, 4.0);

    if (weatherManager && weatherManager.turbulenceIntensity > 0 && windEnabled && !onGround) {
      // Fractal noise rather than sinusoids: real turbulence has gusty lulls and
      // sharp-edged bumps, not a metronome wobble.
      const tIntensity = weatherManager.turbulenceIntensity;
      const tTurb = performance.now() * 0.0009;
      const nz = FlightPhysicsSolver.noise;
      aircraft.angularVelocity.x += (nz.fbm2D(tTurb * 3.1, 7.7, 3) - 0.5) * 4.5 * tIntensity * dt;
      aircraft.angularVelocity.z += (nz.fbm2D(tTurb * 4.3, 23.1, 3) - 0.5) * 7.5 * tIntensity * dt;
      aircraft.angularVelocity.y += (nz.fbm2D(tTurb * 2.2, 47.9, 3) - 0.5) * 2.2 * tIntensity * dt;
    }

    aircraft.group.rotateX(aircraft.angularVelocity.x * dt);
    aircraft.group.rotateY(aircraft.angularVelocity.y * dt);
    aircraft.group.rotateZ(aircraft.angularVelocity.z * dt);
    aircraft.rotation.copy(aircraft.group.rotation);

    // On the ground, keep the attitude sane: wings level, and the nose between a
    // slight nose-down and a safe nose-up limit so the tail can never dig in.
    if (onGround && !aircraft.isSpinning) {
      // Aircraft rotate about the main gear (aft of the CG), so the usable nose-up
      // angle is larger than the raw CG-to-tail geometry implies. Floor it so heavy,
      // long-fuselage types can still rotate to fly, and cap it so the tail is safe.
      const tailStrikeAngle = Math.asin(THREE.MathUtils.clamp(gearHeight / (length * 0.45), 0, 0.9));
      const maxNoseUp = THREE.MathUtils.clamp(tailStrikeAngle * 0.80, 0.14, 0.26); // ~8deg..15deg
      aircraft.rotation.z = THREE.MathUtils.lerp(aircraft.rotation.z, 0, 10.0 * dt);
      aircraft.rotation.x = THREE.MathUtils.clamp(aircraft.rotation.x, -maxNoseUp, 0.03);
      aircraft.group.rotation.copy(aircraft.rotation);
      aircraft.group.quaternion.setFromEuler(aircraft.group.rotation);
    }
    aircraft.quaternion.copy(aircraft.group.quaternion);

    // --- G-force, physiological effects, instruments -------------------------
    // On the wheels the struts carry the weight (1 g); in the air the meter reads
    // the felt load factor measured from the actual forces, correct inverted too.
    const targetG = onGround ? 1.0 : rawLoadFactor;
    aircraft.gForce = THREE.MathUtils.lerp(aircraft.gForce || 1.0, THREE.MathUtils.clamp(targetG, -4.0, 12.0), 10.0 * dt);

    if (aircraft.gForce > 3.8) {
      aircraft.blackout = Math.min(aircraft.blackout + ((aircraft.gForce - 3.8) / 3.7) * dt * 0.4, 1.0);
    } else {
      aircraft.blackout = Math.max(aircraft.blackout - dt * 0.8, 0.0);
    }
    if (aircraft.gForce < 0.1) {
      aircraft.redout = Math.min(aircraft.redout + (Math.abs(0.1 - aircraft.gForce) / 2.1) * dt * 0.4, 1.0);
    } else {
      aircraft.redout = Math.max(aircraft.redout - dt * 0.8, 0.0);
    }

    if (isJet) {
      aircraft.rpm = Math.round(aircraft.engineSpool * (4000 + aircraft.controls.throttle * 10000));
    } else {
      aircraft.rpm = Math.round(aircraft.engineSpool * (600 + aircraft.controls.throttle * 1800));
    }

    // Compass heading: 0 = +Z (runway heading), increasing when turning right (toward -X).
    const yawAngle = Math.atan2(-forward.x, forward.z);
    let degHeading = Math.round(yawAngle * (180 / Math.PI));
    if (degHeading < 0) degHeading += 360;
    aircraft.heading = degHeading;

    // Extra readouts for the HUD/debug displays.
    aircraft.aoaDeg = aoaRad * (180 / Math.PI);
    aircraft.sideslipDeg = sideslipRad * (180 / Math.PI);
    aircraft.machNumber = machNumber;
    aircraft.heightAGL = aircraft.position.y - terrainNow;
  }

  static getTerrainHeightAt(worldX, worldZ) {
    const scale = this.elevationScale;
    const n = this.noise.fbm2D(worldX * scale, worldZ * scale, 4);
    const rawHeight = Math.pow(n, 1.4) * this.maxElevation;
    const distToCenter = Math.abs(worldX);

    if (worldZ > -1500 && worldZ < 2500) {
      const airfieldElevation = 180.0;
      if (distToCenter < 80) {
        return airfieldElevation;
      } else if (distToCenter < 600) {
        const t = (distToCenter - 80) / 520;
        const smoothT = t * t * (3 - 2 * t);
        return THREE.MathUtils.lerp(airfieldElevation, rawHeight, smoothT);
      }
    }
    return rawHeight;
  }
}
