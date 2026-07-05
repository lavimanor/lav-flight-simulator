export class Atmosphere {
  // International Standard Atmosphere: linear temperature lapse through the
  // troposphere, isothermal above 11 km, density from the ideal gas law.
  static T0 = 288.15;      // sea-level temperature (K)
  static P0 = 101325;      // sea-level pressure (Pa)
  static LAPSE = 0.0065;   // tropospheric lapse rate (K/m)
  static R = 287.053;      // specific gas constant for air (J/(kg*K))
  static G = 9.80665;      // standard gravity (m/s^2)
  static TROPOPAUSE = 11000;
  static T_STRAT = 216.65; // stratospheric temperature (K)

  static getTemperature(altitude) {
    const h = Math.max(altitude, 0);
    return Math.max(this.T0 - this.LAPSE * h, this.T_STRAT);
  }

  static getPressure(altitude) {
    const h = Math.max(altitude, 0);
    const exponent = this.G / (this.LAPSE * this.R); // ~5.256
    if (h <= this.TROPOPAUSE) {
      return this.P0 * Math.pow(1 - (this.LAPSE * h) / this.T0, exponent);
    }
    const pTropopause = this.P0 * Math.pow(1 - (this.LAPSE * this.TROPOPAUSE) / this.T0, exponent);
    return pTropopause * Math.exp(-this.G * (h - this.TROPOPAUSE) / (this.R * this.T_STRAT));
  }

  static getDensity(altitude) {
    return this.getPressure(altitude) / (this.R * this.getTemperature(altitude));
  }

  static getSpeedOfSound(altitude) {
    return Math.sqrt(1.4 * this.R * this.getTemperature(altitude));
  }
}
