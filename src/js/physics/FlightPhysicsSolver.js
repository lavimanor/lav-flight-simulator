import * as THREE from 'three';
import { Noise } from '../utils/Noise.js';
import { Atmosphere } from './Atmosphere.js';
import { PropulsionSolver } from './PropulsionSolver.js';
import { DragSolver } from './DragSolver.js';
import { BrakeSolver } from './BrakeSolver.js';
import { LiftSolver } from './LiftSolver.js';

export class FlightPhysicsSolver {
  static noise = new Noise(12345);
  static elevationScale = 0.00015;
  static maxElevation = 700;
  static solve(aircraft, deltaTime) {
    const config = aircraft.config;
    const dt = Math.min(deltaTime, 0.05);
    if (aircraft.isCrashed) {
      aircraft.velocity.set(0, 0, 0);
      aircraft.angularVelocity.set(0, 0, 0);
      aircraft.airspeed = 0;
      aircraft.indicatedAirspeed = 0;
      aircraft.groundSpeed = 0;
      return;
    }
    const forwardVector = new THREE.Vector3(0, 0, 1).applyQuaternion(aircraft.group.quaternion);
    const localUpVector = new THREE.Vector3(0, 1, 0).applyQuaternion(aircraft.group.quaternion);
    const settings = aircraft.engine?.moduleManager?.get('Settings');
    const windEnabled = settings ? settings.enableWind : true;
    const weatherManager = aircraft.engine?.moduleManager?.get('Weather');
    const windVector = (weatherManager && windEnabled) ? weatherManager.wind : new THREE.Vector3(0, 0, 0);
    aircraft.altitude = aircraft.position.y;
    const airDensity = Atmosphere.getDensity(aircraft.position.y);
    const speedOfSound = Atmosphere.getSpeedOfSound(aircraft.position.y);
    const terrainHeight = aircraft.engine?.moduleManager?.get('Terrain')
      ? aircraft.engine.moduleManager.get('Terrain').getHeightAt(aircraft.position.x, aircraft.position.z)
      : this.getTerrainHeightAt(aircraft.position.x, aircraft.position.z);
    const groundClearance = terrainHeight + (config.groundClearanceOffset ?? 1.2);
    const waterLevel = 135.0;
    if (aircraft.isSinking) {
      aircraft.airspeed = THREE.MathUtils.lerp(aircraft.airspeed, 0.0, 5.0 * dt);
      aircraft.indicatedAirspeed = aircraft.airspeed;
      aircraft.velocity.set(forwardVector.x * aircraft.airspeed, -2.5, forwardVector.z * aircraft.airspeed);
      aircraft.position.addScaledVector(aircraft.velocity, dt);
      if (aircraft.position.y < waterLevel - 6.0) {
        aircraft.position.y = waterLevel - 6.0;
        aircraft.velocity.set(0, 0, 0);
        if (!aircraft.isCrashed) {
          aircraft.isCrashed = true;
          console.log(`[FlightPhysicsSolver] Splash down complete. Submersion crash triggered.`);
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
      console.log(`[FlightPhysicsSolver] WATER IMPACT - SINKING PHASE INITIATED`);
      return;
    }
    let geLiftMultiplier = 1.0;
    const wingSpan = config.dimensions.span;
    const relativeHeight = aircraft.position.y - terrainHeight;
    if (relativeHeight < wingSpan) {
      const geFactor = (wingSpan - Math.max(relativeHeight, 0)) / wingSpan;
      geLiftMultiplier = 1.0 + 0.15 * geFactor;
    }
    let flapsLiftBonus = 1.0;
    if (aircraft.flapsStage === 1) {
      flapsLiftBonus = 1.20;
    } else if (aircraft.flapsStage === 2) {
      flapsLiftBonus = 1.45;
    }
    const vForward = aircraft.velocity.dot(forwardVector);
    const vUp = aircraft.velocity.dot(localUpVector);
    const aoaRad = (Math.abs(vForward) > 0.1) ? Math.atan2(-vUp, vForward) : 0.0;
    const thrustForceMagnitude = PropulsionSolver.solve(aircraft, airDensity, dt);
    const dragForceMagnitude = DragSolver.solve(aircraft, airDensity, aoaRad, speedOfSound, dt);
    const gravityAcceleration = -9.81 * forwardVector.y;
    const forwardAcceleration = ((thrustForceMagnitude - dragForceMagnitude) / config.mass) + gravityAcceleration;
    aircraft.airspeed += forwardAcceleration * dt;
    const onGround = aircraft.position.y <= groundClearance + 0.05;
    if (onGround) {
      const brakingDeceleration = BrakeSolver.solve(aircraft, onGround, dt);
      aircraft.airspeed = Math.max(aircraft.airspeed - brakingDeceleration * dt, 0.0);
    } else {
      aircraft.isBellyScraping = false;
    }
    const terminalSpeed = config.id === 'fighter' ? 140.0 : 50.0;
    aircraft.airspeed = Math.max(Math.min(aircraft.airspeed, terminalSpeed), 0.0);
    const seaLevelDensity = 1.225;
    aircraft.indicatedAirspeed = aircraft.airspeed * Math.sqrt(airDensity / seaLevelDensity);
    const { liftForceVector, sinkAcceleration } = LiftSolver.solve(aircraft, airDensity, geLiftMultiplier, flapsLiftBonus, aoaRad, dt);
    aircraft.sinkRate = aircraft.sinkRate || 0.0;
    if (aircraft.position.y > groundClearance + 0.1) {
      aircraft.sinkRate = THREE.MathUtils.lerp(aircraft.sinkRate, sinkAcceleration * 2.0, 4.0 * dt);
    } else {
      aircraft.sinkRate = THREE.MathUtils.lerp(aircraft.sinkRate, 0.0, 10.0 * dt);
    }
    const localRightVector = new THREE.Vector3(1, 0, 0).applyQuaternion(aircraft.group.quaternion);
    const bankAngleRad = aircraft.rotation.z;
    const slipDriftSpeed = -Math.sin(bankAngleRad) * Math.min(aircraft.airspeed / 20.0, 1.0) * 4.0;
    const targetVelocityVector = forwardVector.clone().multiplyScalar(aircraft.airspeed);
    targetVelocityVector.addScaledVector(localRightVector, slipDriftSpeed);
    targetVelocityVector.y -= aircraft.sinkRate;
    targetVelocityVector.addScaledVector(windVector, 0.15);
    aircraft.velocity.copy(targetVelocityVector);
    aircraft.position.addScaledVector(aircraft.velocity, dt);
    aircraft.groundSpeed = Math.sqrt(aircraft.velocity.x * aircraft.velocity.x + aircraft.velocity.z * aircraft.velocity.z);
    if (aircraft.position.y <= groundClearance) {
      const preClampSinkingSpeed = aircraft.velocity.y;
      const pitchAngleRadLocal = Math.asin(THREE.MathUtils.clamp(forwardVector.y, -1.0, 1.0));
      const pitchAngleDeg = Math.abs(pitchAngleRadLocal * (180 / Math.PI));
      const noseDiveImpact = pitchAngleDeg > 20.0;
      const severeHardSlam = preClampSinkingSpeed < -10.0;
      const highSpeedBellyScrape = aircraft.gearRetracted && aircraft.airspeed > 12.0;
      if (noseDiveImpact || severeHardSlam || highSpeedBellyScrape) {
        aircraft.isCrashed = true;
        aircraft.velocity.set(0, 0, 0);
        aircraft.angularVelocity.set(0, 0, 0);
        aircraft.airspeed = 0;
        aircraft.indicatedAirspeed = 0;
        aircraft.groundSpeed = 0;
        console.log(`[FlightPhysicsSolver] CRASH DETECTED! NoseImpact: ${noseDiveImpact}, HardSlam: ${severeHardSlam}, BellyScrape: ${highSpeedBellyScrape}`);
        return;
      }
      aircraft.position.y = groundClearance;
      aircraft.velocity.y = 0;
      aircraft.velocity.x *= 0.90;
      aircraft.rotation.x = 0;
      aircraft.rotation.z = 0;
      aircraft.group.rotation.copy(aircraft.rotation);
    }
    aircraft.group.position.copy(aircraft.position);
    const stallSpeed = config.id === 'fighter' ? 28.0 : 14.0;
    aircraft.isStalled = (aircraft.indicatedAirspeed < stallSpeed) && (aircraft.position.y > terrainHeight + 2.0);
    if (aircraft.isStalled) {
      const stallNoseDropMoment = 0.8 * dt;
      aircraft.angularVelocity.x += stallNoseDropMoment;
      aircraft.angularVelocity.x += (Math.random() - 0.5) * 0.15;
      aircraft.angularVelocity.z += (Math.random() - 0.5) * 0.15;
      if (!aircraft.isSpinning && (Math.abs(aircraft.controls.roll) > 0.5 || Math.abs(aircraft.controls.yaw) > 0.5)) {
        aircraft.isSpinning = true;
        aircraft.spinDir = Math.sign(aircraft.controls.roll || aircraft.controls.yaw);
      }
    } else {
      aircraft.isSpinning = false;
    }
    const controlEffectiveness = (aircraft.isStalled || onGround) ? 0.08 : Math.min(aircraft.airspeed / 15.0, 1.2);
    aircraft.controls.pitchSmoothed = THREE.MathUtils.lerp(aircraft.controls.pitchSmoothed || 0, aircraft.controls.pitch, 8.0 * dt);
    aircraft.controls.rollSmoothed = THREE.MathUtils.lerp(aircraft.controls.rollSmoothed || 0, aircraft.controls.roll, 8.0 * dt);
    aircraft.controls.yawSmoothed = THREE.MathUtils.lerp(aircraft.controls.yawSmoothed || 0, aircraft.controls.yaw, 8.0 * dt);
    let pitchVelocity = -aircraft.controls.pitchSmoothed * config.pitchRate * controlEffectiveness;
    let rollVelocity = aircraft.controls.rollSmoothed * config.rollRate * controlEffectiveness;
    let yawVelocity = -aircraft.controls.yawSmoothed * config.yawRate * controlEffectiveness;
    if (aircraft.isSpinning) {
      rollVelocity = aircraft.spinDir * 3.5;
      yawVelocity = aircraft.spinDir * 1.5;
      pitchVelocity = 0.5;
      if (aircraft.controls.pitch < -0.5 && aircraft.indicatedAirspeed > stallSpeed) {
        aircraft.isSpinning = false;
        aircraft.isStalled = false;
      }
    }
    let machTuckMoment = 0.0;
    const machNumber = aircraft.airspeed / speedOfSound;
    if (config.id === 'fighter' && machNumber > 0.90 && machNumber < 1.25) {
      const tuckFactor = Math.sin((machNumber - 0.90) * Math.PI / 0.35);
      machTuckMoment = 0.32 * tuckFactor * dt;
    }
    const densityRatio = airDensity / 1.225;
    const speedRatio = Math.min(aircraft.airspeed / 20.0, 1.2);
    const rotationalDamping = 1.5 * densityRatio * speedRatio;
    aircraft.angularVelocity.x = THREE.MathUtils.lerp(aircraft.angularVelocity.x, pitchVelocity + machTuckMoment, (6.0 + rotationalDamping) * dt);
    aircraft.angularVelocity.y = THREE.MathUtils.lerp(aircraft.angularVelocity.y, yawVelocity, (6.0 + rotationalDamping) * dt);
    aircraft.angularVelocity.z = THREE.MathUtils.lerp(aircraft.angularVelocity.z, rollVelocity, (6.0 + rotationalDamping) * dt);
    if (weatherManager && weatherManager.turbulenceIntensity > 0) {
      const tIntensity = weatherManager.turbulenceIntensity;
      const time = performance.now() * 0.012;
      const tPitchGust = Math.sin(time * 3.7) * 0.08 * tIntensity;
      const tRollGust = Math.cos(time * 4.9) * 0.15 * tIntensity;
      const tYawGust = Math.sin(time * 2.3) * 0.04 * tIntensity;
      aircraft.angularVelocity.x += tPitchGust;
      aircraft.angularVelocity.z += tRollGust;
      aircraft.angularVelocity.y += tYawGust;
    }
    aircraft.group.rotateX(aircraft.angularVelocity.x * dt);
    aircraft.group.rotateZ(aircraft.angularVelocity.z * dt);
    aircraft.group.rotateY(aircraft.angularVelocity.y * dt);
    aircraft.rotation.copy(aircraft.group.rotation);
    aircraft.quaternion.copy(aircraft.group.quaternion);
    const gravityContribution = localUpVector.y;
    const pitchGScale = config.id === 'fighter' ? 6.5 : 2.5;
    const pitchG = aircraft.controls.pitchSmoothed * pitchGScale * Math.min(aircraft.airspeed / 25.0, 1.5);
    const turnG = Math.sin(Math.abs(aircraft.rotation.z)) * 2.0 * Math.min(aircraft.airspeed / 25.0, 1.5);
    const calculatedG = gravityContribution + pitchG + turnG;
    aircraft.gForce = THREE.MathUtils.lerp(aircraft.gForce || 1.0, calculatedG, 6.0 * dt);
    if (aircraft.gForce > 3.8) {
      const deltaFactor = (aircraft.gForce - 3.8) / 3.7;
      aircraft.blackout = Math.min(aircraft.blackout + deltaFactor * dt * 0.4, 1.0);
    } else {
      aircraft.blackout = Math.max(aircraft.blackout - dt * 0.8, 0.0);
    }
    if (aircraft.gForce < 0.1) {
      const deltaFactor = Math.abs(0.1 - aircraft.gForce) / 2.1;
      aircraft.redout = Math.min(aircraft.redout + deltaFactor * dt * 0.4, 1.0);
    } else {
      aircraft.redout = Math.max(aircraft.redout - dt * 0.8, 0.0);
    }
    aircraft.verticalSpeed = aircraft.velocity.y;
    if (config.id === 'fighter') {
      aircraft.rpm = Math.round(aircraft.engineSpool * (4000 + aircraft.controls.throttle * 10000));
    } else {
      aircraft.rpm = Math.round(aircraft.engineSpool * (600 + aircraft.controls.throttle * 1800));
    }
    const yawAngle = Math.atan2(forwardVector.x, forwardVector.z);
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