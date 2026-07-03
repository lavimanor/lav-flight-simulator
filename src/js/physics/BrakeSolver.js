import * as THREE from 'three';

export class BrakeSolver {
  static solve(aircraft, onGround, dt) {
    if (!onGround) {
      return 0.0;
    }

    const config = aircraft.config;
    let decelerationRate = 0.0;

    // Belly skid friction models
    if (aircraft.gearRetracted) {
      aircraft.isBellyScraping = true;
      const bellyFrictionCoefficient = 0.90; // Severe friction slowing plane down rapidly
      const normalForceN = config.mass * 9.81;
      const slidingResistanceForce = normalForceN * bellyFrictionCoefficient;
      decelerationRate = slidingResistanceForce / config.mass;
    } else {
      // Normal landing gear configuration
      aircraft.isBellyScraping = false;
      let rollResistanceCoefficient = 0.015; // Low rolling friction for takeoff runs

      const targetBrakePressure = aircraft.controls.brakes ? 1.0 : 0.0;
      aircraft.brakePressure = THREE.MathUtils.lerp(aircraft.brakePressure || 0.0, targetBrakePressure, 8.0 * dt);

      if (aircraft.brakePressure > 0.01) {
        const pneumaticBrakeCoef = 0.62; // Progressive pneumatic braking
        rollResistanceCoefficient += pneumaticBrakeCoef * aircraft.brakePressure;
      }

      const normalForceN = config.mass * 9.81;
      const groundBrakingForce = normalForceN * rollResistanceCoefficient;
      decelerationRate = groundBrakingForce / config.mass;
    }

    return decelerationRate;
  }
}