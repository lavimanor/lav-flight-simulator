export class Atmosphere {
  static getDensity(altitude) {
    const seaLevelDensity = 1.225;
    const scaleHeight = 8500;
    return seaLevelDensity * Math.exp(-Math.max(altitude, 0) / scaleHeight);
  }
  static getSpeedOfSound(altitude) {
    const t0 = 288.15;
    const lapseRate = 0.0065;
    const temperature = Math.max(t0 - lapseRate * altitude, 216.65);
    return 20.05 * Math.sqrt(temperature);
  }
}