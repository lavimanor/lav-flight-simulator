import * as THREE from 'three';

export class FlightPathVector {
  constructor() {
    this.element = null;
  }

  init() {
    this.element = document.getElementById('hud-fpv');
  }

  /**
   * Projects the aircraft's 3D velocity vector onto the 2D viewport coordinates.
   * @param {AircraftBase} aircraft 
   * @param {THREE.Camera} camera 
   */
  update(aircraft, camera) {
    if (!this.element) return;

    // If stationary on runway ground, or crashed, hide the FPV marker
    if (aircraft.airspeed < 2.0 || aircraft.isCrashed) {
      this.element.style.display = 'none';
      return;
    }

    // 1. Get traveling direction vector
    const travelDirection = aircraft.velocity.clone().normalize();

    // 2. Project 3D vector target point (10 meters ahead along glide vector) into Camera View NDC
    const projectionPoint = camera.position.clone().addScaledVector(travelDirection, 10.0);
    projectionPoint.project(camera);

    // If coordinate target falls behind the camera viewport plane, hide the reticle
    if (projectionPoint.z > 1.0) {
      this.element.style.display = 'none';
      return;
    }

    // 3. Translate Normalized Device Coordinates (NDC) to percentage screen bounds
    const percentX = (projectionPoint.x * 0.5 + 0.5) * 100;
    const percentY = (1.0 - (projectionPoint.y * 0.5 + 0.5)) * 100;

    // Clamp inside comfortable cockpit HUD borders to keep drawing centered (e.g. 15% to 85%)
    const clampedX = Math.max(Math.min(percentX, 85), 15);
    const clampedY = Math.max(Math.min(percentY, 85), 15);

    this.element.style.display = 'block';
    this.element.style.left = `${clampedX}%`;
    this.element.style.top = `${clampedY}%`;
  }
}