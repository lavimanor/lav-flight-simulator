import * as THREE from 'three';
import { Aerodynamics } from './Aerodynamics.js';

export class DragSolver {
  /**
   * Solves parasite drag, induced lift-drag, flap adjustments, and speedbrake deployment state.
   * @param {AircraftBase} aircraft 
   * @param {number} airDensity 
   * @param {number} aoaRad
   * @param {number} speedOfSound
   * @param {number} dt 
   * @returns {number} Total drag force (Newtons)
   */
  static solve(aircraft, airDensity, aoaRad, speedOfSound, relativeHeight, dt) {
    const config = aircraft.config;

    // Flaps configuration drag adjustments
    let flapsDragMultiplier = 1.0;
    if (aircraft.flapsStage === 1) {
      flapsDragMultiplier = 1.08;
    } else if (aircraft.flapsStage === 2) {
      flapsDragMultiplier = 1.25;
    }

    // Extended tricycle landing gear drag penalty
    const gearDragMultiplier = aircraft.gearRetracted ? 1.0 : 1.25;

    // Smooth deployment actuation for airbrakes
    const targetAirbrakeDeploy = aircraft.airbrakesActive ? 1.0 : 0.0;
    aircraft.airbrakeDeployState = THREE.MathUtils.lerp(aircraft.airbrakeDeployState || 0.0, targetAirbrakeDeploy, 6.0 * dt);

    // Speedbrake drag multiplier
    const airbrakeCDMultiplier = 1.0 + 5.0 * aircraft.airbrakeDeployState;

    // Resolve drag coefficient using true Angle of Attack (AoA)
    const CL = Aerodynamics.getLiftCoefficient(aoaRad, config.liftCoefficientMax);

    // Induced drag calculation with ground effect reduction
    const oswaldFactor = 0.8;
    const dragPolarFactor = 1.0 / (Math.PI * config.aspectRatio * oswaldFactor);
    const inducedDragCD = dragPolarFactor * CL * CL;

    // Induced drag reduction factor (phi) based on altitude/wingspan ratio
    const span = config.dimensions.span;
    const h_over_b = Math.max(relativeHeight, 0) / span;
    const phi = (16.0 * h_over_b * 16.0 * h_over_b) / (1.0 + 16.0 * h_over_b * 16.0 * h_over_b);
    const effectiveInducedDragCD = inducedDragCD * Math.min(Math.max(phi, 0.25), 1.0);

    const baseCD = config.dragCoefficientZero + effectiveInducedDragCD;

    // Compressibility Wave Drag coefficient rise (sound barrier wave resistance centered near Mach 1.05)
    let waveDragCD = 0.0;
    const machNumber = aircraft.airspeed / speedOfSound;
    if (config.id === 'fighter' && machNumber > 0.8) {
      // Bell curve representing transonic wave drag peak
      const transonicPeak = Math.exp(-Math.pow(machNumber - 1.05, 2) / 0.02);
      waveDragCD = 0.065 * transonicPeak;
    }

    // Combined drag profile scaling
    const compositeCD = (baseCD + waveDragCD) * flapsDragMultiplier * gearDragMultiplier * airbrakeCDMultiplier;

    // Dynamic Pressure: Q = 0.5 * rho * V^2
    const dynamicPressure = 0.5 * airDensity * aircraft.airspeed * aircraft.airspeed;

    // Newtonian Drag Formula: D = Q * S * CD
    return dynamicPressure * config.wingArea * compositeCD;
  }
}