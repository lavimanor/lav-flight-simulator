export class Aerodynamics {
  // Critical (stall) angle of attack in radians (~15 degrees).
  static criticalAoA = 15 * (Math.PI / 180);
  // Lift-curve slope per radian (thin-airfoil is ~2*PI; real wings are a bit less).
  static liftCurveSlope = 5.7;

  // Prandtl-Glauert compressibility: the lift-curve slope steepens as Mach rises,
  // capped so the singular behavior near Mach 1 stays bounded, then relaxes on
  // the supersonic side where the slope actually falls off.
  static compressibilityFactor(mach) {
    if (mach <= 0.3) return 1.0;
    if (mach < 1.0) {
      const m = Math.min(mach, 0.92);
      return Math.min(1.0 / Math.sqrt(1.0 - m * m), 1.35);
    }
    // Supersonic: slope decreases ~ 1/sqrt(M^2 - 1), blended to avoid a jump.
    return Math.max(1.35 - (mach - 1.0) * 0.9, 0.75);
  }

  // Shock-induced flow separation erodes the usable maximum lift coefficient in
  // the transonic band ("shock stall") - the origin of the coffin corner.
  static machCLmaxFactor(mach) {
    if (mach <= 0.5) return 1.0;
    return Math.max(1.0 - (mach - 0.5) * 0.55, 0.62);
  }

  // Returns the lift coefficient for a given angle of attack.
  // Below the critical angle the curve is linear; beyond it the wing stalls and
  // lift falls off toward a low flat-plate value instead of staying pinned at max.
  // criticalAoARad lets swept/delta planforms carry lift to higher alpha.
  static getLiftCoefficient(aoa, maxCL = 1.4, mach = 0, criticalAoARad = null) {
    const crit = criticalAoARad ?? this.criticalAoA;
    const absAoA = Math.abs(aoa);
    const sign = aoa < 0 ? -1 : 1;
    const slope = this.liftCurveSlope * this.compressibilityFactor(mach);
    const effMaxCL = maxCL * this.machCLmaxFactor(mach);

    if (absAoA <= crit) {
      // Linear region, clamped to the wing's usable maximum.
      const linearCL = slope * aoa;
      return Math.max(Math.min(linearCL, effMaxCL), -effMaxCL);
    }

    // Post-stall: lift decays past the critical angle down to a residual value.
    const clAtStall = Math.min(slope * crit, effMaxCL);
    const over = absAoA - crit;
    const decayed = clAtStall - 2.2 * over;          // sharp lift loss just after the break
    const residual = 0.6 * effMaxCL;                 // flat-plate style residual lift
    return sign * Math.max(decayed, residual * Math.max(0, 1 - over));
  }

  static getDragCoefficient(CL, cd0, aspectRatio) {
    const oswaldFactor = 0.8;
    const dragPolarFactor = 1.0 / (Math.PI * aspectRatio * oswaldFactor);
    return cd0 + dragPolarFactor * CL * CL;
  }
}
