import * as THREE from 'three';
import { Aerodynamics } from './Aerodynamics.js';

export class LiftSolver {
  /**
   * Calculates the true aerodynamic lift force vector using the standard lift equation: L = 0.5 * rho * v^2 * S * CL
   * @param {AircraftBase} aircraft 
   * @param {number} airDensity 
   * @param {number} geLiftMultiplier 
   * @param {number} flapsLiftBonus 
   * @param {number} aoaRad
   * @param {number} dt 
   * @returns {Object} { liftForceVector, sinkAcceleration }
   */
  static solve(aircraft, airDensity, geLiftMultiplier, flapsLiftBonus, aoaRad, dt) {
    const config = aircraft.config;
    const localUpVector = new THREE.Vector3(0, 1, 0).applyQuaternion(aircraft.group.quaternion);
    
    // Resolve basic lift coefficient based on true aerodynamic angle of attack
    const baseCL = Aerodynamics.getLiftCoefficient(aoaRad, config.liftCoefficientMax);
    
    // Flaps deployment increases the composite maximum lift coefficient
    const flapsCLBonus = (aircraft.flapsStage === 1) ? 0.25 : (aircraft.flapsStage === 2 ? 0.50 : 0.0);
    const CL = (baseCL + flapsCLBonus) * geLiftMultiplier;

    // Dynamic pressure: Q = 0.5 * rho * V^2
    const dynamicPressure = 0.5 * airDensity * aircraft.airspeed * aircraft.airspeed;

    // Lift force magnitude: L = Q * S * CL * flapsBonus
    let liftMagnitude = dynamicPressure * config.wingArea * CL * flapsLiftBonus;

    // Lift acts orthogonal to the wing plane (along local Up vector)
    const liftForceVector = localUpVector.clone().multiplyScalar(liftMagnitude);

    // Calculate vertical gravity deficit sink rate for stalls and low speeds
    const weightForceN = config.mass * 9.81;
    const liftY = liftMagnitude * localUpVector.y;
    const liftDeficit = Math.max(weightForceN - liftY, 0.0);
    
    // Gravity deficit acceleration (Force / Mass)
    const sinkAcceleration = liftDeficit / config.mass;

    return { liftForceVector, sinkAcceleration };
  }
}