import * as THREE from 'three';

export class BrakeSolver {
  /**
   * Solves friction coefficients from runway contact surfaces, wheel brakes, and belly scrapes.
   * @param {AircraftBase} aircraft 
   * @param {boolean} onGround 
   * @param {number} dt 
   * @returns {number} Combined deceleration rate (m/s^2)
   */
  static solve(aircraft, onGround, dt) {
    if (!onGround) {
      return 0.0;
    }

    const config = aircraft.config;
    let decelerationRate = 0.0;

    if (aircraft.gearRetracted) {
      // Belly landing sliding friction scenario (Increased friction coefficient for rapid runway stops)
      aircraft.isBellyScraping = true;
      const bellyFrictionCoefficient = 0.85;
      const normalForceN = config.mass * 9.81;
      const slidingResistanceForce = normalForceN * bellyFrictionCoefficient;

      decelerationRate = slidingResistanceForce / config.mass;
    } else {
      aircraft.isBellyScraping = false;

      // Wheel rolling resistance resistance coefficient
      let rollResistanceCoefficient = 0.02;

      // Smooth pneumatic pressure buildup for wheel brake systems
      const targetBrakePressure = aircraft.controls.brakes ? 1.0 : 0.0;
      aircraft.brakePressure = THREE.MathUtils.lerp(aircraft.brakePressure || 0.0, targetBrakePressure, 8.0 * dt);

      if (aircraft.brakePressure > 0.01) {
        // High-friction disc braking coefficient for immediate parking and deceleration response
        const pneumaticBrakeCoef = 0.65;
        rollResistanceCoefficient += pneumaticBrakeCoef * aircraft.brakePressure;
      }

      const normalForceN = config.mass * 9.81;
      const groundBrakingForce = normalForceN * rollResistanceCoefficient;

      decelerationRate = groundBrakingForce / config.mass;
    }

    return decelerationRate;
  }
}