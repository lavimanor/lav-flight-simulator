import * as THREE from 'three';

export class PropulsionSolver {
  static solve(aircraft, airDensity, dt) {
    const config = aircraft.config;
    const isJet = config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(config.id);

    // Fuel burning loops
    if (aircraft.engineSpool > 0.1 && aircraft.fuel > 0) {
      const afterburnerBurnFactor = aircraft.afterburnerActive ? 4.5 : 1.0;
      const maxBurnRate = isJet ? 2.5 : 0.012; // Jets consume dramatically more fuel
      const fuelBurn = aircraft.controls.throttle * maxBurnRate * afterburnerBurnFactor * aircraft.engineSpool * dt;
      aircraft.fuel = Math.max(aircraft.fuel - fuelBurn, 0);
    }

    if (aircraft.fuel <= 0 && aircraft.engineOn) {
      aircraft.engineOn = false;
      console.log(`[PropulsionSolver] ENG FLAMEOUT - FUEL DEPLETED`);
    }

    const targetSpool = aircraft.engineOn && aircraft.fuel > 0 ? 1.0 : 0.0;
    
    // Spool speed: propeller engines spool almost instantly (turboprops), jets have rotational lag
    const spoolRate = isJet ? (targetSpool > aircraft.engineSpool ? 1.8 : 2.5) : 8.0;
    aircraft.engineSpool = THREE.MathUtils.lerp(aircraft.engineSpool, targetSpool, spoolRate * dt);

    const effectiveThrottle = aircraft.fuel > 0 ? aircraft.controls.throttle : 0;
    const afterburnerThrustMultiplier = aircraft.afterburnerActive ? 1.65 : 1.0;

    // Density derating: engine thrust decreases as altitude increases and air grows thin
    const seaLevelDensity = 1.225;
    const densityRatio = airDensity / seaLevelDensity;
    const altitudeThrustCoefficient = 0.32 + 0.68 * densityRatio;

    const baseThrustForce = effectiveThrottle * config.maxThrust * afterburnerThrustMultiplier * aircraft.engineSpool;

    // Propeller thrust lapse: a fixed-pitch prop makes strong static thrust for
    // takeoff but loses it as forward speed approaches the design maximum, so the
    // aircraft settles at a realistic cruise/terminal speed instead of accelerating
    // without limit. Jet thrust stays essentially flat with speed (drag limits it).
    let speedLapse = 1.0;
    if (!isJet) {
      const propMaxSpeed = (config.terminalSpeed ?? 60.0) * 1.15;
      speedLapse = THREE.MathUtils.clamp(1.0 - Math.max(aircraft.airspeed, 0) / propMaxSpeed, 0.08, 1.0);
    }

    return baseThrustForce * altitudeThrustCoefficient * speedLapse;
  }
}