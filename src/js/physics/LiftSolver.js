import * as THREE from 'three';
import { Aerodynamics } from './Aerodynamics.js';

export class LiftSolver {
  static solve(aircraft, airDensity, geLiftMultiplier, flapsLiftBonus, aoaRad, dt) {
    const config = aircraft.config;
    const localUpVector = new THREE.Vector3(0, 1, 0).applyQuaternion(aircraft.group.quaternion);

    // Compute standard lift coefficients via polar curves
    const baseCL = Aerodynamics.getLiftCoefficient(aoaRad, config.liftCoefficientMax);
    
    // Add additional lift coefficients from high-lift flap surfaces
    const flapsCLBonus = (aircraft.flapsStage === 1) ? 0.28 : (aircraft.flapsStage === 2 ? 0.55 : 0.0);
    const CL = (baseCL + flapsCLBonus) * geLiftMultiplier;

    // Dynamic Pressure Equation: q = 0.5 * rho * V^2
    const dynamicPressure = 0.5 * airDensity * aircraft.airspeed * aircraft.airspeed;

    // Lift Force calculation: L = q * S * Cl
    let liftMagnitude = dynamicPressure * config.wingArea * CL * flapsLiftBonus;
    
    // Prevent negative lift calculations from drawing the plane down through the surface
    if (liftMagnitude < 0.0) liftMagnitude = 0.0;

    const liftForceVector = localUpVector.clone().multiplyScalar(liftMagnitude);
    const weightForceN = config.mass * 9.81;

    // Calculate vertical lift offset relative to gravity
    const liftY = liftMagnitude * localUpVector.y;
    const liftDeficit = Math.max(weightForceN - liftY, 0.0);
    
    const sinkAcceleration = liftDeficit / config.mass;

    return { liftForceVector, sinkAcceleration };
  }
}