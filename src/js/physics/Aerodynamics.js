export class Aerodynamics {
  // Critical (stall) angle of attack in radians (~15 degrees).
  static criticalAoA = 15 * (Math.PI / 180);
  // Lift-curve slope per radian (thin-airfoil is ~2*PI; real wings are a bit less).
  static liftCurveSlope = 5.7;

  // Returns the lift coefficient for a given angle of attack.
  // Below the critical angle the curve is linear; beyond it the wing stalls and
  // lift falls off toward a low flat-plate value instead of staying pinned at max.
  static getLiftCoefficient(aoa, maxCL = 1.4) {
    const crit = this.criticalAoA;
    const absAoA = Math.abs(aoa);
    const sign = aoa < 0 ? -1 : 1;

    if (absAoA <= crit) {
      // Linear region, clamped to the wing's usable maximum.
      const linearCL = this.liftCurveSlope * aoa;
      return Math.max(Math.min(linearCL, maxCL), -maxCL);
    }

    // Post-stall: lift decays past the critical angle down to a residual value.
    const clAtStall = Math.min(this.liftCurveSlope * crit, maxCL);
    const over = absAoA - crit;
    const decayed = clAtStall - 2.2 * over;          // sharp lift loss just after the break
    const residual = 0.6 * maxCL;                     // flat-plate style residual lift
    return sign * Math.max(decayed, residual * Math.max(0, 1 - over));
  }

  static getDragCoefficient(CL, cd0, aspectRatio) {
    const oswaldFactor = 0.8;
    const dragPolarFactor = 1.0 / (Math.PI * aspectRatio * oswaldFactor);
    return cd0 + dragPolarFactor * CL * CL;
  }
}
