import * as THREE from 'three';

export class PropulsionSolver {
  static solve(aircraft, airDensity, dt) {
    const config = aircraft.config;
    const isJet = config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(config.id);

    // Fuel burning loops. A running engine never burns zero: idle keeps the
    // core turning at ~7% of the max-throttle rate, so parking on the runway
    // with the engine on still empties the tanks eventually.
    if (aircraft.engineSpool > 0.1 && aircraft.fuel > 0) {
      const afterburnerBurnFactor = aircraft.afterburnerActive ? 4.5 : 1.0;
      const maxBurnRate = isJet ? 2.5 : 0.012; // Jets consume dramatically more fuel
      const throttleFraction = aircraft.engineOn ? (0.07 + 0.93 * aircraft.controls.throttle) : 0.0;
      const fuelBurn = throttleFraction * maxBurnRate * afterburnerBurnFactor * aircraft.engineSpool * dt;
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

    // Altitude lapse. Turbofans lose thrust roughly with density^0.7 (the fan
    // does more of the work up high); turboprops similarly hold power well; and
    // normally-aspirated pistons follow the Gagg-Ferrar rule, which falls off
    // faster than density alone.
    const isTurboprop = !isJet && (config.engineType || '').toLowerCase().includes('turboprop');
    const seaLevelDensity = 1.225;
    const densityRatio = THREE.MathUtils.clamp(airDensity / seaLevelDensity, 0.0, 1.0);
    const altitudeThrustCoefficient = (isJet || isTurboprop)
      ? Math.pow(densityRatio, 0.7)
      : Math.max(1.132 * densityRatio - 0.132, 0.05);

    const baseThrustForce = effectiveThrottle * config.maxThrust * afterburnerThrustMultiplier * aircraft.engineSpool;

    // Propeller thrust lapse: a piston/turboprop delivers roughly constant POWER,
    // so thrust falls off as ~P/V once the aircraft is moving. Below vStatic the
    // prop is at its static-thrust plateau (it cannot exceed T0 standing still).
    // Jet thrust stays essentially flat with speed (drag limits top speed).
    let speedLapse = 1.0;
    if (!isJet) {
      // Knee of the T(V) curve. Constant-speed turboprop props absorb rated
      // power across most of the envelope; fixed-pitch pistons lose out early.
      const vStatic = (isTurboprop ? 0.45 : 0.18) * (config.terminalSpeed ?? 60.0);
      speedLapse = THREE.MathUtils.clamp(vStatic / Math.max(aircraft.airspeed, vStatic), 0.08, 1.0);
    }

    return baseThrustForce * altitudeThrustCoefficient * speedLapse;
  }
}
