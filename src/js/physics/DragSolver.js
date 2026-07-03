import * as THREE from 'three';
import { Aerodynamics } from './Aerodynamics.js';

export class DragSolver {
  static solve(aircraft, airDensity, aoaRad, speedOfSound, relativeHeight, dt) {
    const config = aircraft.config;
    const isJet = config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(config.id);

    let flapsDragMultiplier = 1.0;
    if (aircraft.flapsStage === 1) {
      flapsDragMultiplier = 1.08;
    } else if (aircraft.flapsStage === 2) {
      flapsDragMultiplier = 1.25;
    }

    const gearDragMultiplier = aircraft.gearRetracted ? 1.0 : 1.25;

    const targetAirbrakeDeploy = aircraft.airbrakesActive ? 1.0 : 0.0;
    aircraft.airbrakeDeployState = THREE.MathUtils.lerp(aircraft.airbrakeDeployState || 0.0, targetAirbrakeDeploy, 6.0 * dt);
    const airbrakeCDMultiplier = 1.0 + 5.0 * aircraft.airbrakeDeployState;

    const CL = Aerodynamics.getLiftCoefficient(aoaRad, config.liftCoefficientMax);
    const oswaldFactor = 0.8;
    const dragPolarFactor = 1.0 / (Math.PI * config.aspectRatio * oswaldFactor);
    const inducedDragCD = dragPolarFactor * CL * CL;

    const span = config.dimensions.span;
    const h_over_b = Math.max(relativeHeight, 0) / span;
    const phi = (16.0 * h_over_b * 16.0 * h_over_b) / (1.0 + 16.0 * h_over_b * 16.0 * h_over_b);
    const effectiveInducedDragCD = inducedDragCD * Math.min(Math.max(phi, 0.25), 1.0);

    const baseCD = config.dragCoefficientZero + effectiveInducedDragCD;

    let waveDragCD = 0.0;
    const machNumber = aircraft.airspeed / speedOfSound;
    if (isJet && machNumber > 0.8) {
      const transonicPeak = Math.exp(-Math.pow(machNumber - 1.05, 2) / 0.02);
      waveDragCD = 0.065 * transonicPeak;
    }

    const compositeCD = (baseCD + waveDragCD) * flapsDragMultiplier * gearDragMultiplier * airbrakeCDMultiplier;
    const dynamicPressure = 0.5 * airDensity * aircraft.airspeed * aircraft.airspeed;

    return dynamicPressure * config.wingArea * compositeCD;
  }
}