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
 * Rotation is integrated from aerodynamic moments (elevator/aileron/rudder plus
 * damping and static stability). A dedicated ground model keeps the aircraft on
 * its wheels, adds rolling/braking friction, and only lets the nose rotate once
 * the aircraft is fast enough to fly - which prevents the "tap the elevator and
 * the tail digs in" behaviour.
 *
 * Frame conventions (must match the renderer/camera):
 *   local +Z = forward, +Y = up, +X = right (starboard)
 *   group.rotateX(+) pitches the nose DOWN, rotateY(+) yaws right, rotateZ(+) rolls left.
 */
export class FlightPhysicsSolver {
  static noise = new Noise(12345);
  static elevationScale = 0.00015;
  static maxElevation = 700;

  // Handling tunables. These are aircraft-independent shape factors; per-aircraft
  // scaling comes from the JSON config (pitchRate, wingArea, mass, ...).
  static tuning = {
    pitchControl: 0.055,   // elevator authority
    rollControl: 0.090,    // aileron authority
    yawControl: 0.040,     // rudder authority
    pitchDamp: 1.1,        // pitch rate damping
    rollDamp: 1.6,         // roll rate damping
    yawDamp: 1.0,          // yaw rate damping
    pitchStability: 0.30,  // static longitudinal stability (returns toward trim AoA)
    yawStability: 1.2,     // weathervane stability (aligns nose with airflow -> turns)
    aoaTrim: 0.06          // built-in trim angle of attack (~3.5deg) so hands-off flight sustains lift
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
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);

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
    const rightSpeed = relVel.dot(right);
    const aoaRad = (V > 1.0) ? Math.atan2(-upSpeed, forwardSpeed) : 0.0;
    const sideslipRad = (V > 1.0) ? Math.atan2(rightSpeed, Math.abs(forwardSpeed)) : 0.0;

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

    // Effective max lift coefficient (with flaps) sets the real stall/rotate speeds.
    const flapsCLBonus = (aircraft.flapsStage === 1) ? 0.28 : (aircraft.flapsStage === 2 ? 0.55 : 0.0);
    const effectiveCLmax = config.liftCoefficientMax + flapsCLBonus;
    const stallSpeed = Math.sqrt((2 * weightN) / (Math.max(airDensity, 0.2) * config.wingArea * effectiveCLmax));
    const rotateSpeed = 0.90 * stallSpeed; // begin raising the nose just below stall speed

    // --- Aerodynamic + propulsive forces ------------------------------------
    const thrustMag = PropulsionSolver.solve(aircraft, airDensity, dt);
    const { liftMagnitude } = LiftSolver.solve(aircraft, airDensity, geLiftMultiplier, aoaRad, V);
    const dragMag = DragSolver.solve(aircraft, airDensity, aoaRad, speedOfSound, heightAboveGround, dt, V);

    const netForce = new THREE.Vector3();
    netForce.addScaledVector(forward, thrustMag);         // thrust along the nose
    netForce.y -= weightN;                                // gravity

    if (V > 0.5) {
      const airflowDir = relVel.clone().multiplyScalar(1 / V);
      // Drag opposes the direction of travel through the air.
      netForce.addScaledVector(airflowDir, -dragMag);
      // Lift is perpendicular to the relative airflow, on the wing's "up" side.
      let side = up.clone().cross(airflowDir);
      if (side.lengthSq() < 1e-6) side = right.clone();
      side.normalize();
      const liftDir = airflowDir.clone().cross(side).normalize();
      if (liftDir.dot(up) < 0) liftDir.negate();
      netForce.addScaledVector(liftDir, liftMagnitude);
    }

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

      // Rolling / braking / belly friction opposes horizontal motion.
      const horizSpeed = Math.hypot(aircraft.velocity.x, aircraft.velocity.z);
      if (horizSpeed > 1e-4) {
        const decel = BrakeSolver.solve(aircraft, true, dt);
        const scale = Math.max(horizSpeed - decel * dt, 0.0) / horizSpeed;
        aircraft.velocity.x *= scale;
        aircraft.velocity.z *= scale;
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
    const leftTip = aircraft.position.clone().addScaledVector(right, -span * 0.48);
    const rightTip = aircraft.position.clone().addScaledVector(right, span * 0.48);

    const noseDug = nose.y < FlightPhysicsSolver.getTerrainHeightAt(nose.x, nose.z);
    const tailDug = tail.y < FlightPhysicsSolver.getTerrainHeightAt(tail.x, tail.z);
    const leftDug = leftTip.y < FlightPhysicsSolver.getTerrainHeightAt(leftTip.x, leftTip.z);
    const rightDug = rightTip.y < FlightPhysicsSolver.getTerrainHeightAt(rightTip.x, rightTip.z);

    const obstacleManager = aircraft.engine?.moduleManager?.get('Obstacles');
    const hitObstacle = obstacleManager ? obstacleManager.checkCollision(aircraft) : false;

    // Crash conditions (forgiving: normal runway ops and gentle touchdowns are safe).
    const hardTouchdown = wasAirborne && onGround && touchdownSink > (aircraft.gearRetracted ? 4.5 : 9.0);
    const noseStrike = noseDug && (pitchDeg < -18.0 || touchdownSink > 6.0);
    const tailStrike = tailDug && (pitchDeg > 16.0 || touchdownSink > 6.0);
    const wingStrike = (leftDug || rightDug) && bankDeg > 22.0 && aircraft.groundSpeed > 8.0;

    if (hardTouchdown || noseStrike || tailStrike || wingStrike || hitObstacle) {
      aircraft.isCrashed = true;
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
      // A stalled wing drops its nose; asymmetry can develop into a spin.
      aircraft.angularVelocity.x += 0.6 * dt;
      aircraft.angularVelocity.x += (Math.random() - 0.5) * 0.10;
      aircraft.angularVelocity.z += (Math.random() - 0.5) * 0.10;
      if (!aircraft.isSpinning && (Math.abs(aircraft.controls.roll) > 0.5 || Math.abs(aircraft.controls.yaw) > 0.5)) {
        aircraft.isSpinning = true;
        aircraft.spinDir = Math.sign(aircraft.controls.roll || aircraft.controls.yaw) || 1;
      }
    } else {
      aircraft.isSpinning = false;
    }

    // --- Rotational dynamics -------------------------------------------------
    aircraft.controls.pitchSmoothed = THREE.MathUtils.lerp(aircraft.controls.pitchSmoothed || 0, aircraft.controls.pitch, 8.0 * dt);
    aircraft.controls.rollSmoothed = THREE.MathUtils.lerp(aircraft.controls.rollSmoothed || 0, aircraft.controls.roll, 8.0 * dt);
    aircraft.controls.yawSmoothed = THREE.MathUtils.lerp(aircraft.controls.yawSmoothed || 0, aircraft.controls.yaw, 8.0 * dt);

    const pitchCmd = aircraft.controls.pitchSmoothed; // +1 (S) = nose up
    const rollCmd = aircraft.controls.rollSmoothed;   // +1 (D) = bank right
    const yawCmd = aircraft.controls.yawSmoothed;      // +1 (E) = nose right

    // Control effectiveness scales with dynamic pressure; a small floor keeps the
    // aircraft recoverable at very low airborne speed.
    const controlSpeed = Math.max(V, 12.0);
    const controlQ = 0.5 * airDensity * controlSpeed * controlSpeed;
    const qSc = controlQ * config.wingArea;

    const T = FlightPhysicsSolver.tuning;

    // Inertia estimates (thin-body approximations).
    const Ixx = (1 / 12) * currentMass * span * span;                 // roll
    const Iyy = (1 / 12) * currentMass * length * length;             // pitch
    const Izz = (1 / 12) * currentMass * (span * span + length * length); // yaw

    // Body-axis torques. +X = nose down, +Y = nose right, +Z = roll left.
    const dampScale = (controlSpeed / 20.0) * densityRatio;

    let tauX = -pitchCmd * config.pitchRate * T.pitchControl * qSc * length * stallFactor; // elevator (nose up = -X)
    tauX += T.pitchStability * (aoaRad - T.aoaTrim) * qSc * length * stallFactor;           // static stability toward trim AoA
    tauX += -aircraft.angularVelocity.x * T.pitchDamp * dampScale * Iyy;                    // pitch damping

    let tauZ = -rollCmd * config.rollRate * T.rollControl * qSc * span * stallFactor;       // aileron (bank right = -Z)
    tauZ += -aircraft.angularVelocity.z * T.rollDamp * dampScale * Ixx;                     // roll damping

    let tauY = yawCmd * config.yawRate * T.yawControl * qSc * length * stallFactor;         // rudder (nose right = +Y)
    tauY += T.yawStability * sideslipRad * qSc * length * stallFactor;                      // weathervane -> coordinates turns
    tauY += -aircraft.angularVelocity.y * T.yawDamp * dampScale * Izz;                      // yaw damping

    // Optional per-type effects.
    if (config.id === 'f22') { // thrust vectoring stays effective at low speed
      tauX += -pitchCmd * thrustMag * 0.4;
      tauY += yawCmd * thrustMag * 0.15;
    }
    if (isJet && machNumber > 0.90 && machNumber < 1.25) { // transonic "mach tuck"
      tauX += 0.30 * Math.sin((machNumber - 0.90) * Math.PI / 0.35) * Iyy;
    }

    const pitchAccel = tauX / Iyy;
    const rollAccel = tauZ / Ixx;
    const yawAccel = tauY / Izz;

    if (aircraft.isSpinning) {
      aircraft.angularVelocity.z = aircraft.spinDir * 3.0;
      aircraft.angularVelocity.y = aircraft.spinDir * 1.2;
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
        ? aircraft.angularVelocity.x + pitchAccel * dt
        : THREE.MathUtils.lerp(aircraft.angularVelocity.x, 0, 10.0 * dt);
      // Nosewheel/rudder steering, scaled by speed.
      if (Math.abs(forwardSpeed) > 0.5) {
        aircraft.angularVelocity.y = yawCmd * config.yawRate * THREE.MathUtils.clamp(forwardSpeed / 25.0, 0, 1) * 0.8;
      } else {
        aircraft.angularVelocity.y = 0;
      }
    } else {
      aircraft.angularVelocity.x += pitchAccel * dt;
      aircraft.angularVelocity.y += yawAccel * dt;
      aircraft.angularVelocity.z += rollAccel * dt;
    }

    aircraft.angularVelocity.x = THREE.MathUtils.clamp(aircraft.angularVelocity.x, -3.0, 3.0);
    aircraft.angularVelocity.y = THREE.MathUtils.clamp(aircraft.angularVelocity.y, -2.0, 2.0);
    aircraft.angularVelocity.z = THREE.MathUtils.clamp(aircraft.angularVelocity.z, -4.0, 4.0);

    if (weatherManager && weatherManager.turbulenceIntensity > 0 && windEnabled) {
      const tIntensity = weatherManager.turbulenceIntensity;
      const time = performance.now() * 0.012;
      aircraft.angularVelocity.x += Math.sin(time * 3.7) * 0.06 * tIntensity;
      aircraft.angularVelocity.z += Math.cos(time * 4.9) * 0.12 * tIntensity;
      aircraft.angularVelocity.y += Math.sin(time * 2.3) * 0.03 * tIntensity;
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
    const targetG = onGround ? 1.0 : (weightN > 0 ? liftMagnitude / weightN : 1.0);
    aircraft.gForce = THREE.MathUtils.lerp(aircraft.gForce || 1.0, THREE.MathUtils.clamp(targetG, -4.0, 12.0), 6.0 * dt);

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

    const yawAngle = Math.atan2(forward.x, forward.z);
    let degHeading = Math.round(yawAngle * (180 / Math.PI));
    if (degHeading < 0) degHeading += 360;
    aircraft.heading = degHeading;
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
