import * as THREE from 'three';
export class FlightPathVector {
  constructor() {
    this.element = null;
  }
  init() {
    this.element = document.getElementById('hud-fpv');
  }
  update(aircraft, camera) {
    if (!this.element) return;
    if (aircraft.airspeed < 2.0 || aircraft.isCrashed) {
      this.element.style.display = 'none';
      return;
    }
    const travelDirection = aircraft.velocity.clone().normalize();
    const projectionPoint = camera.position.clone().addScaledVector(travelDirection, 10.0);
    projectionPoint.project(camera);
    if (projectionPoint.z > 1.0) {
      this.element.style.display = 'none';
      return;
    }
    const percentX = (projectionPoint.x * 0.5 + 0.5) * 100;
    const percentY = (1.0 - (projectionPoint.y * 0.5 + 0.5)) * 100;
    const clampedX = Math.max(Math.min(percentX, 85), 15);
    const clampedY = Math.max(Math.min(percentY, 85), 15);
    this.element.style.display = 'block';
    this.element.style.left = `${clampedX}%`;
    this.element.style.top = `${clampedY}%`;
  }
}