export class Aerodynamics {
  static getLiftCoefficient(aoa, maxCL = 1.4) {
    let CL = 2.0 * Math.PI * aoa;
    const criticalStallAngle = 15 * (Math.PI / 180);
    if (Math.abs(aoa) > criticalStallAngle) {
      CL *= 0.5;
    }
    return Math.max(Math.min(CL, maxCL), -maxCL);
  }
  static getDragCoefficient(CL, cd0, aspectRatio) {
    const oswaldFactor = 0.8;
    const dragPolarFactor = 1.0 / (Math.PI * aspectRatio * oswaldFactor);
    return cd0 + dragPolarFactor * CL * CL;
  }
}