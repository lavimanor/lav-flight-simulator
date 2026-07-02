import * as THREE from 'three';
export class BrakeSolver {
  static solve(aircraft, onGround, dt) {
    if (!onGround) {
      return 0.0;
    }
    const config = aircraft.config;
    let decelerationRate = 0.0;
    if (aircraft.gearRetracted) {
      aircraft.isBellyScraping = true;
      const bellyFrictionCoefficient = 0.85;
      const normalForceN = config.mass * 9.81;
      const slidingResistanceForce = normalForceN * bellyFrictionCoefficient;
      decelerationRate = slidingResistanceForce / config.mass;
    } else {
      aircraft.isBellyScraping = false;
      let rollResistanceCoefficient = 0.02;
      const targetBrakePressure = aircraft.controls.brakes ? 1.0 : 0.0;
      aircraft.brakePressure = THREE.MathUtils.lerp(aircraft.brakePressure || 0.0, targetBrakePressure, 8.0 * dt);
      if (aircraft.brakePressure > 0.01) {
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