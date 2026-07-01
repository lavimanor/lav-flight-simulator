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

  /**
   * Computes the Speed of Sound (m/s) at a given altitude (meters)
   * based on the standard ISA temperature lapse rate.
   * @param {number} altitude 
   * @returns {number} speedOfSound (m/s)
   */
  static getSpeedOfSound(altitude) {
    const t0 = 288.15; // Sea level temperature (Kelvin)
    const lapseRate = 0.0065; // Temperature drop per meter (K/m)
    const temperature = Math.max(t0 - lapseRate * altitude, 216.65); // Floor at stratosphere boundary temp (216.65K)
    
    // Speed of sound = sqrt(gamma * R * T) ≈ 20.05 * sqrt(T)
    return 20.05 * Math.sqrt(temperature);
  }
}