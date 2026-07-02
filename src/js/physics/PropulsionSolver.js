import * as THREE from 'three';
export class PropulsionSolver {
  static solve(aircraft, airDensity, dt) {
    const config = aircraft.config;
    if (aircraft.engineSpool > 0.1 && aircraft.fuel > 0) {
      const afterburnerBurnFactor = aircraft.afterburnerActive ? 3.5 : 1.0;
      const maxBurnRate = config.id === 'fighter' ? 2.2 : 0.015;
      const fuelBurn = aircraft.controls.throttle * maxBurnRate * afterburnerBurnFactor * aircraft.engineSpool * dt;
      aircraft.fuel = Math.max(aircraft.fuel - fuelBurn, 0);
    }
    if (aircraft.fuel <= 0 && aircraft.engineOn) {
      aircraft.engineOn = false;
      console.log(`[PropulsionSolver] ENG FLAMEOUT - FUEL DEPLETED`);
    }
    const targetSpool = aircraft.engineOn && aircraft.fuel > 0 ? 1.0 : 0.0;
    const spoolRate = targetSpool > aircraft.engineSpool ? 4.0 : 5.0;
    aircraft.engineSpool = THREE.MathUtils.lerp(aircraft.engineSpool, targetSpool, spoolRate * dt);
    const effectiveThrottle = aircraft.fuel > 0 ? aircraft.controls.throttle : 0;
    const afterburnerThrustMultiplier = aircraft.afterburnerActive ? 1.6 : 1.0;
    const seaLevelDensity = 1.225;
    const densityRatio = airDensity / seaLevelDensity;
    const altitudeThrustCoefficient = 0.35 + 0.65 * densityRatio;
    const baseThrustForce = effectiveThrottle * config.maxThrust * afterburnerThrustMultiplier * aircraft.engineSpool;
    return baseThrustForce * altitudeThrustCoefficient;
  }
}