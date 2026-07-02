import * as THREE from 'three';
import { Aerodynamics } from './Aerodynamics.js';
export class DragSolver {
  static solve(aircraft, airDensity, aoaRad, speedOfSound, dt) {
    const config = aircraft.config;
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
    const CD = Aerodynamics.getDragCoefficient(CL, config.dragCoefficientZero, config.aspectRatio);
    let waveDragCD = 0.0;
    const machNumber = aircraft.airspeed / speedOfSound;
    if (config.id === 'fighter' && machNumber > 0.8) {
      const transonicPeak = Math.exp(-Math.pow(machNumber - 1.05, 2) / 0.02);
      waveDragCD = 0.065 * transonicPeak;
    }
    const compositeCD = (CD + waveDragCD) * flapsDragMultiplier * gearDragMultiplier * airbrakeCDMultiplier;
    const dynamicPressure = 0.5 * airDensity * aircraft.airspeed * aircraft.airspeed;
    return dynamicPressure * config.wingArea * compositeCD;
  }
}