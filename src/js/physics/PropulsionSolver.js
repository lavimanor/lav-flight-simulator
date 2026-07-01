import * as THREE from 'three';

export class PropulsionSolver {
  /**
   * Updates engine spooling, calculates fuel burn, and returns active thrust force.
   * @param {AircraftBase} aircraft 
   * @param {number} airDensity 
   * @param {number} dt 
   * @returns {number} Thrust output force (Newtons)
   */
  static solve(aircraft, airDensity, dt) {
    const config = aircraft.config;

    // Spool engine fuel consumption checks
    if (aircraft.engineSpool > 0.1 && aircraft.fuel > 0) {
      const afterburnerBurnFactor = aircraft.afterburnerActive ? 3.5 : 1.0;
      const maxBurnRate = config.id === 'fighter' ? 2.2 : 0.015;
      const fuelBurn = aircraft.controls.throttle * maxBurnRate * afterburnerBurnFactor * aircraft.engineSpool * dt;
      aircraft.fuel = Math.max(aircraft.fuel - fuelBurn, 0);
    }

    // Flameout conditions
    if (aircraft.fuel <= 0 && aircraft.engineOn) {
      aircraft.engineOn = false;
      console.log(`[PropulsionSolver] ENG FLAMEOUT - FUEL DEPLETED`);
    }

    // Highly responsive turbofan mechanical RPM spool rates
    const targetSpool = aircraft.engineOn && aircraft.fuel > 0 ? 1.0 : 0.0;
    const spoolRate = targetSpool > aircraft.engineSpool ? 4.0 : 5.0; 
    aircraft.engineSpool = THREE.MathUtils.lerp(aircraft.engineSpool, targetSpool, spoolRate * dt);

    const effectiveThrottle = aircraft.fuel > 0 ? aircraft.controls.throttle : 0;
    const afterburnerThrustMultiplier = aircraft.afterburnerActive ? 1.6 : 1.0;

    // Turbofan/Propeller thrust derating at elevated altitudes (lower ambient air density ratio)
    const seaLevelDensity = 1.225;
    const densityRatio = airDensity / seaLevelDensity;
    const altitudeThrustCoefficient = 0.35 + 0.65 * densityRatio;

    const baseThrustForce = effectiveThrottle * config.maxThrust * afterburnerThrustMultiplier * aircraft.engineSpool;
    return baseThrustForce * altitudeThrustCoefficient;
  }
}