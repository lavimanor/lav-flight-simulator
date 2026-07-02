export class Aerodynamics {
  /**
   * Calculates the lift coefficient (CL) incorporating linear lift and stall effects.
   * @param {number} aoa - Angle of attack in radians
   * @param {number} maxCL - Maximum lift coefficient limit from config
   * @returns {number} CL
   */
  static getLiftCoefficient(aoa, maxCL = 1.4) {
    const criticalStallAngle = 16 * (Math.PI / 180); // 16 degrees in radians
    const absAoA = Math.abs(aoa);

    if (absAoA < criticalStallAngle) {
      // Linear regime
      const CL = 2.0 * Math.PI * aoa;
      return Math.max(Math.min(CL, maxCL), -maxCL);
    } else {
      // Smooth post-stall decay (stall region)
      const postStallAoA = absAoA - criticalStallAngle;
      const decay = Math.cos(Math.min(postStallAoA * 2.5, Math.PI / 2));
      const stallCL = maxCL * 0.65 * decay; // Decays smoothly
      const finalCL = Math.max(stallCL, 0.15);
      return Math.sign(aoa) * finalCL;
    }
  }

  /**
   * Calculates the drag coefficient (CD) combining zero-lift parasite drag and induced lift drag.
   * @param {number} CL - Lift coefficient
   * @param {number} cd0 - Parasitic drag coefficient
   * @param {number} aspectRatio - Aspect ratio of wings
   * @returns {number} CD
   */
  static getDragCoefficient(CL, cd0, aspectRatio) {
    const oswaldFactor = 0.8;
    const dragPolarFactor = 1.0 / (Math.PI * aspectRatio * oswaldFactor);
    return cd0 + dragPolarFactor * CL * CL;
  }
}