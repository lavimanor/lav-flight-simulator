import * as THREE from 'three';
import { Aerodynamics } from './Aerodynamics.js';

export class DragSolver {
  static solve(aircraft, airDensity, aoaRad, speedOfSound, relativeHeight, dt, speed) {
    const config = aircraft.config;
    const isJet = config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(config.id);

    // Flaps drag multipliers
    let flapsDragMultiplier = 1.0;
    if (aircraft.flapsStage === 1) {
      flapsDragMultiplier = 1.12; // Moderate drag penalty for takeoff settings
    } else if (aircraft.flapsStage === 2) {
      flapsDragMultiplier = 1.35; // Severe drag penalty for full dirty landing settings
    }

    // Retractable landing gear parasitical drag multipliers
    const gearDragMultiplier = aircraft.gearRetracted ? 1.0 : 1.30;

    // Aerodynamic speedbrakes drag calculations
    const targetAirbrakeDeploy = aircraft.airbrakesActive ? 1.0 : 0.0;
    aircraft.airbrakeDeployState = THREE.MathUtils.lerp(aircraft.airbrakeDeployState || 0.0, targetAirbrakeDeploy, 6.0 * dt);
    const airbrakeCDMultiplier = 1.0 + 5.5 * aircraft.airbrakeDeployState;

    // Induced drag polar calculations: Cdi = Cl^2 / (pi * AR * e)
    const CL = Aerodynamics.getLiftCoefficient(aoaRad, config.liftCoefficientMax);
    const oswaldFactor = 0.8;
    const dragPolarFactor = 1.0 / (Math.PI * config.aspectRatio * oswaldFactor);
    const inducedDragCD = dragPolarFactor * CL * CL;

    // Ground effect reduces induced drag when within one wingspan of the terrain
    const span = config.dimensions.span;
    const h_over_b = Math.max(relativeHeight, 0) / span;
    const phi = (16.0 * h_over_b * 16.0 * h_over_b) / (1.0 + 16.0 * h_over_b * 16.0 * h_over_b);
    const effectiveInducedDragCD = inducedDragCD * Math.min(Math.max(phi, 0.20), 1.0);

    const baseCD = config.dragCoefficientZero + effectiveInducedDragCD;

    // Transonic wave drag model
    let waveDragCD = 0.0;
    const machNumber = speed / speedOfSound;
    if (isJet && machNumber > 0.82) {
      const transonicPeak = Math.exp(-Math.pow(machNumber - 1.05, 2) / 0.02);
      waveDragCD = 0.075 * transonicPeak; // Supersonic drag barrier profile
    }

    const compositeCD = (baseCD + waveDragCD) * flapsDragMultiplier * gearDragMultiplier * airbrakeCDMultiplier;
    
    // Dynamic drag force equation: D = 0.5 * rho * V^2 * S * Cd (true airspeed)
    const dynamicPressure = 0.5 * airDensity * speed * speed;

    return dynamicPressure * config.wingArea * compositeCD;
  }
}