export class Atmosphere {
  /**
   * Computes the ambient air density (kg/m^3) at a given altitude (meters)
   * using the standard exponential atmospheric model.
   * @param {number} altitude 
   * @returns {number} airDensity
   */
  static getDensity(altitude) {
    const seaLevelDensity = 1.225; // Standard air density at sea level (kg/m^3)
    const scaleHeight = 8500;      // Thickness height scale (meters)
    return seaLevelDensity * Math.exp(-Math.max(altitude, 0) / scaleHeight);
  }
}