import * as THREE from 'three';

export class DragSolver {
  // Drag build-up is additive in coefficient space (the physical way): each
  // dirty-configuration item contributes its own delta-CD on top of the clean
  // zero-lift drag, and induced drag comes from the same CL the wing is
  // actually producing (passed in from the LiftSolver).
  static solve(aircraft, airDensity, CL, speedOfSound, relativeHeight, dt, speed, sideslipRad = 0) {
    const config = aircraft.config;
    const isJet = config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(config.id);

    // Clean airframe zero-lift drag.
    let cd0 = config.dragCoefficientZero;

    // Flaps: extra camber and exposed structure. Stage 2 (landing) is draggy by
    // design. Blowback (flapEffectiveness) removes the drag along with the lift.
    const flapEff = aircraft.flapEffectiveness ?? 1.0;
    if (aircraft.flapsStage === 1) {
      cd0 += 0.013 * flapEff;
    } else if (aircraft.flapsStage === 2) {
      cd0 += 0.055 * flapEff;
    }

    // Extended landing gear: struts, doors and wheels in the airstream. The
    // legs contribute in proportion to how far out they are, and the transit
    // itself is the draggiest moment — gear doors and half-swung legs broadside
    // to the flow — which is why the retraction is felt as a distinct surge.
    const gearPos = aircraft.gearPosition ?? (aircraft.gearRetracted ? 0.0 : 1.0);
    cd0 += 0.020 * gearPos + 0.008 * (4.0 * gearPos * (1.0 - gearPos));

    // A stopped or windmilling propeller is a big flat disc of drag that a
    // running one isn't; an engine-out glide in a prop type is noticeably
    // worse than a simple power-off one. Jets lose almost nothing. Types with
    // a feathering/stowing prop (motor gliders) override the penalty in config.
    if (!isJet) {
      const propStopDrag = config.propStopDrag ?? 0.016;
      cd0 += propStopDrag * (1.0 - (aircraft.engineSpool ?? 1.0));
    }

    // Sideslip drag: the fuselage flying sideways-on presents far more frontal
    // area, which is the whole point of a forward slip on final. Quadratic so
    // the small beta of a coordinated turn costs nearly nothing.
    cd0 += 0.60 * sideslipRad * sideslipRad;

    // Aerodynamic speedbrakes: deploy/retract with actuator lag.
    const targetAirbrakeDeploy = aircraft.airbrakesActive ? 1.0 : 0.0;
    aircraft.airbrakeDeployState = THREE.MathUtils.lerp(aircraft.airbrakeDeployState || 0.0, targetAirbrakeDeploy, 6.0 * dt);
    cd0 += 0.10 * aircraft.airbrakeDeployState;

    // Induced drag polar: Cdi = CL^2 / (pi * AR * e), using the real working CL
    // (including flap lift) so slow dirty flight costs the right amount of thrust.
    // Span efficiency is per-airframe: sailplanes approach the elliptical ideal,
    // low-AR deltas ride on inefficient vortex lift, most others sit near 0.8.
    const oswaldFactor = config.oswaldFactor ?? 0.8;
    const dragPolarFactor = 1.0 / (Math.PI * config.aspectRatio * oswaldFactor);
    const inducedDragCD = dragPolarFactor * CL * CL;

    // Ground effect reduces induced drag when within one wingspan of the terrain.
    const span = config.dimensions.span;
    const h_over_b = Math.max(relativeHeight, 0) / span;
    const phi = (16.0 * h_over_b * 16.0 * h_over_b) / (1.0 + 16.0 * h_over_b * 16.0 * h_over_b);
    const effectiveInducedDragCD = inducedDragCD * Math.min(Math.max(phi, 0.20), 1.0);

    // Transonic wave drag: a sharp rise approaching Mach 1 that peaks just past
    // it, then settles to a persistent supersonic residual (area-rule bodies
    // never get their subsonic drag back).
    let waveDragCD = 0.0;
    const machNumber = speed / speedOfSound;
    if (isJet && machNumber > 0.82) {
      const transonicPeak = Math.exp(-Math.pow(machNumber - 1.05, 2) / 0.02);
      waveDragCD = 0.075 * transonicPeak;
      if (machNumber > 1.05) {
        waveDragCD = Math.max(waveDragCD, 0.028);
      }
    }

    const compositeCD = cd0 + effectiveInducedDragCD + waveDragCD;

    // Dynamic drag force equation: D = 0.5 * rho * V^2 * S * Cd (true airspeed)
    const dynamicPressure = 0.5 * airDensity * speed * speed;

    return dynamicPressure * config.wingArea * compositeCD;
  }
}
