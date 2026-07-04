import * as THREE from 'three';
export class ILSIndicator {
  constructor() {
    this.glideslopeBar = null;
    this.localizerBar = null;
    this.ilsBox = null;
    this.touchdownPoint = new THREE.Vector3(0, 180.02, -900);
  }
  init() {
    this.glideslopeBar = document.getElementById('hud-ils-glideslope');
    this.localizerBar = document.getElementById('hud-ils-localizer');
    this.ilsBox = document.getElementById('hud-ils-container');
  }
  update(aircraft) {
    if (!this.glideslopeBar || !this.localizerBar || !this.ilsBox) return;
    const dx = aircraft.position.x - this.touchdownPoint.x;
    const dy = aircraft.position.y - this.touchdownPoint.y;
    const dz = aircraft.position.z - this.touchdownPoint.z;
    const approachDistanceZ = dz;
    if (approachDistanceZ < 100 || approachDistanceZ > 8000 || Math.abs(dx) > 1000) {
      this.ilsBox.classList.add('hidden');
      return;
    }
    this.ilsBox.classList.remove('hidden');
    const maxLocalizerTolerance = 150.0 * (approachDistanceZ / 4000.0);
    const localizerDevNorm = THREE.MathUtils.clamp(dx / Math.max(maxLocalizerTolerance, 30.0), -1.0, 1.0);
    const idealAngleRad = 3.0 * (Math.PI / 180.0);
    const idealRelativeAltitude = Math.tan(idealAngleRad) * approachDistanceZ;
    const altitudeDifference = dy - idealRelativeAltitude;
    const glideslopeDevNorm = THREE.MathUtils.clamp(altitudeDifference / 60.0, -1.0, 1.0);
    // Fly-to needle: when the aircraft drifts to the pilot's right of the
    // centerline (dx > 0 on this approach heading), the needle deflects left.
    const localizerPercent = 50 - (localizerDevNorm * 40);
    this.localizerBar.style.left = `${localizerPercent}%`;
    const glideslopePercent = 50 + (glideslopeDevNorm * 40);
    this.glideslopeBar.style.top = `${glideslopePercent}%`;
  }
}