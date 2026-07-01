export class Aerodynamics {
  /**
   * Calculates the lift coefficient (CL) incorporating linear lift and stall effects.
   * @param {number} aoa - Angle of attack in radians
   * @param {number} maxCL - Maximum lift coefficient limit from config
   * @returns {number} CL
   */
  static getLiftCoefficient(aoa, maxCL = 1.4) {
    let CL = 2.0 * Math.PI * aoa;
    const criticalStallAngle = 15 * (Math.PI / 180); // 15 degrees in radians
    
    if (Math.abs(aoa) > criticalStallAngle) {
      CL *= 0.5; // Stall region: lift decays 50%
    }
    return Math.max(Math.min(CL, maxCL), -maxCL);
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