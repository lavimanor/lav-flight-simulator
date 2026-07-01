import * as THREE from 'three';
import { Aerodynamics } from './Aerodynamics.js';

export class DragSolver {
  /**
   * Solves parasite drag, induced lift-drag, flap adjustments, and speedbrake deployment state.
   * @param {AircraftBase} aircraft 
   * @param {number} airDensity 
   * @param {number} dt 
   * @returns {number} Total drag force (Newtons)
   */
  static solve(aircraft, airDensity, dt) {
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

    // Significantly increased airbrake drag modifier to allow rapid energy bleed
    const airbrakeCDMultiplier = 1.0 + 5.0 * aircraft.airbrakeDeployState;

    // Resolve structural Angle of Attack (AoA) for induced drag polars (using true vector pitch)
    const forwardVector = new THREE.Vector3(0, 0, 1).applyQuaternion(aircraft.group.quaternion);
    const pitchAngleRad = Math.asin(THREE.MathUtils.clamp(forwardVector.y, -1.0, 1.0));
    const CL = Aerodynamics.getLiftCoefficient(pitchAngleRad, config.liftCoefficientMax);
    const CD = Aerodynamics.getDragCoefficient(CL, config.dragCoefficientZero, config.aspectRatio);

    // Combined drag profile scaling
    const compositeCD = CD * flapsDragMultiplier * gearDragMultiplier * airbrakeCDMultiplier;

    // Dynamic Pressure: Q = 0.5 * rho * V^2
    const dynamicPressure = 0.5 * airDensity * aircraft.airspeed * aircraft.airspeed;

    // Newtonian Drag Formula: D = Q * S * CD
    return dynamicPressure * config.wingArea * compositeCD;
  }
}