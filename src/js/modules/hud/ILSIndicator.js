import * as THREE from 'three';

export class ILSIndicator {
  constructor() {
    this.glideslopeBar = null;
    this.localizerBar = null;
    this.ilsBox = null;
    
    // Ideal Runway TDZ threshold approach starting coordinate
    this.touchdownPoint = new THREE.Vector3(0, 180.02, -900); 
  }

  init() {
    this.glideslopeBar = document.getElementById('hud-ils-glideslope');
    this.localizerBar = document.getElementById('hud-ils-localizer');
    this.ilsBox = document.getElementById('hud-ils-container');
  }

  /**
   * Calculates localizer centerline and glideslope vertical deviations.
   * @param {AircraftBase} aircraft 
   */
  update(aircraft) {
    if (!this.glideslopeBar || !this.localizerBar || !this.ilsBox) return;

    // Calculate longitudinal distance relative to Runway touchdown boundary along Z tracking
    const dx = aircraft.position.x - this.touchdownPoint.x;
    const dy = aircraft.position.y - this.touchdownPoint.y;
    const dz = aircraft.position.z - this.touchdownPoint.z;

    const approachDistanceZ = dz; 

    // Enable scales only when flying inside the designated approach landing sector box
    if (approachDistanceZ < 100 || approachDistanceZ > 8000 || Math.abs(dx) > 1000) {
      this.ilsBox.classList.add('hidden');
      return;
    }

    this.ilsBox.classList.remove('hidden');

    // Localizer (Lateral Runway Centerline offset deviation)
    // Dynamic scale width adjusts relative to closeness
    const maxLocalizerTolerance = 150.0 * (approachDistanceZ / 4000.0);
    const localizerDevNorm = THREE.MathUtils.clamp(dx / Math.max(maxLocalizerTolerance, 30.0), -1.0, 1.0);

    // Glideslope (Vertical deviation relative to ideal 3-degree glide elevation angle)
    const idealAngleRad = 3.0 * (Math.PI / 180.0);
    const idealRelativeAltitude = Math.tan(idealAngleRad) * approachDistanceZ;
    const altitudeDifference = dy - idealRelativeAltitude;

    // Standard 60m vertical offset represents full glideslope scale limit
    const glideslopeDevNorm = THREE.MathUtils.clamp(altitudeDifference / 60.0, -1.0, 1.0);

    // Map normalized range (-1.0 to 1.0) inside 10% to 90% HUD container position layouts
    const localizerPercent = 50 + (localizerDevNorm * 40);
    this.localizerBar.style.left = `${localizerPercent}%`;

    // Standard aviation glideslope needle indicates where the glideslope path is relative to the pilot.
    // If you are flying high (altitudeDifference > 0), the path is below you, so the indicator needle drops.
    const glideslopePercent = 50 + (glideslopeDevNorm * 40);
    this.glideslopeBar.style.top = `${glideslopePercent}%`;
  }
}