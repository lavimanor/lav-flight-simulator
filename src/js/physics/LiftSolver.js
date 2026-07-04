import { Aerodynamics } from './Aerodynamics.js';

export class LiftSolver {
  // Returns the scalar lift magnitude (N) and the working lift coefficient.
  // The FlightPhysicsSolver is responsible for orienting the lift force in space
  // (perpendicular to the relative airflow), so this stays a pure force model.
  static solve(aircraft, airDensity, geLiftMultiplier, aoaRad, speed) {
    const config = aircraft.config;

    // Base lift coefficient from the wing's polar curve.
    const baseCL = Aerodynamics.getLiftCoefficient(aoaRad, config.liftCoefficientMax);

    // High-lift flap surfaces add camber (extra CL) at the low-speed settings.
    const flapsCLBonus = (aircraft.flapsStage === 1) ? 0.28 : (aircraft.flapsStage === 2 ? 0.55 : 0.0);

    // Ground effect boosts effective lift near the surface.
    const CL = (baseCL + flapsCLBonus) * geLiftMultiplier;

    // Dynamic pressure q = 0.5 * rho * V^2, using true airspeed magnitude.
    const dynamicPressure = 0.5 * airDensity * speed * speed;

    // Lift force: L = q * S * CL. Sign is preserved so negative AoA pushes down.
    const liftMagnitude = dynamicPressure * config.wingArea * CL;

    return { liftMagnitude, CL };
  }
}
