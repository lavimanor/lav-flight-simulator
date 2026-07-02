import * as THREE from 'three';
import { Aerodynamics } from './Aerodynamics.js';
export class LiftSolver {
  static solve(aircraft, airDensity, geLiftMultiplier, flapsLiftBonus, aoaRad, dt) {
    const config = aircraft.config;
    const localUpVector = new THREE.Vector3(0, 1, 0).applyQuaternion(aircraft.group.quaternion);
    const baseCL = Aerodynamics.getLiftCoefficient(aoaRad, config.liftCoefficientMax);
    const flapsCLBonus = (aircraft.flapsStage === 1) ? 0.25 : (aircraft.flapsStage === 2 ? 0.50 : 0.0);
    const CL = (baseCL + flapsCLBonus) * geLiftMultiplier;
    const dynamicPressure = 0.5 * airDensity * aircraft.airspeed * aircraft.airspeed;
    let liftMagnitude = dynamicPressure * config.wingArea * CL * flapsLiftBonus;
    const liftForceVector = localUpVector.clone().multiplyScalar(liftMagnitude);
    const weightForceN = config.mass * 9.81;
    const liftY = liftMagnitude * localUpVector.y;
    const liftDeficit = Math.max(weightForceN - liftY, 0.0);
    const sinkAcceleration = liftDeficit / config.mass;
    return { liftForceVector, sinkAcceleration };
  }
}