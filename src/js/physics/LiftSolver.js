import { Aerodynamics } from './Aerodynamics.js';

export class LiftSolver {
  // Returns the scalar lift magnitude (N) and the working lift coefficients.
  // The FlightPhysicsSolver is responsible for orienting the lift force in space
  // (perpendicular to the relative airflow), so this stays a pure force model.
  static solve(aircraft, airDensity, geLiftMultiplier, aoaRad, speed, mach = 0) {
    const config = aircraft.config;

    // Base lift coefficient from the wing's polar curve (Mach-corrected), using
    // the aircraft's own stall angle when the config specifies one.
    const critAoA = config.criticalAoADeg ? config.criticalAoADeg * (Math.PI / 180) : null;
    const baseCL = Aerodynamics.getLiftCoefficient(aoaRad, config.liftCoefficientMax, mach, critAoA);

    // High-lift flap surfaces add camber (extra CL) at the low-speed settings.
    // flapEffectiveness (from the physics solver) folds the benefit away above
    // the flap placard speed so overspeed flight can't keep landing-flap lift.
    const flapsCLBonus = ((aircraft.flapsStage === 1) ? 0.28 : (aircraft.flapsStage === 2 ? 0.55 : 0.0))
      * (aircraft.flapEffectiveness ?? 1.0);

    // CL without ground effect: this is what induced drag should be charged for
    // (ground effect reduces induced drag, so the GE boost must not inflate it).
    const CL = baseCL + flapsCLBonus;

    // Ground effect boosts effective lift near the surface.
    const effectiveCL = CL * geLiftMultiplier;

    // Dynamic pressure q = 0.5 * rho * V^2, using true airspeed magnitude.
    const dynamicPressure = 0.5 * airDensity * speed * speed;

    // Lift force: L = q * S * CL. Sign is preserved so negative AoA pushes down.
    const liftMagnitude = dynamicPressure * config.wingArea * effectiveCL;

    return { liftMagnitude, CL };
  }
}
