import * as THREE from 'three';

export class CameraManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.currentMode = 'menuOrbit'; // Initialized in orbit view on startup

    // Offset coordinates (X: center, Y: 4m above fuselage, Z: -15m behind fuselage)
    this.offset = new THREE.Vector3(0, 4, -15);
    
    this.lookAheadDistance = 6.0; // Focus target is projected 6 meters ahead of the aircraft nose
    this.lerpSpeed = 7.5;         // Position follow speed
    this.cameraSlerpSpeed = 2.2;  // Slower slerp provides cinematic rotation lag (lag behind roll/yaw)
    this.isFirstFrame = true;

    this.cameraQuat = new THREE.Quaternion();
    this.targetCameraPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // Pre-flight circular sweep orientation angles
    this.orbitAngle = 0.0;
  }

  init(engine) {
    this.engine = engine;
  }

  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }

    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

    const aircraft = this.aircraftManager.activeAircraft;
    const camera = this.engine.camera;

    if (this.currentMode === 'thirdPerson') {
      this.updateThirdPersonFollow(aircraft, camera, deltaTime);
    } else if (this.currentMode === 'menuOrbit') {
      this.updateMenuOrbit(aircraft, camera, deltaTime);
    }
  }

  updateThirdPersonFollow(aircraft, camera, deltaTime) {
    // 1. Smoothly interpolate a trailing quaternion to lag behind aircraft's roll/yaw rotations
    const slerpFactor = 1.0 - Math.exp(-this.cameraSlerpSpeed * deltaTime);
    this.cameraQuat.slerp(aircraft.group.quaternion, slerpFactor);

    // 2. Calculate ideal camera position by rotating local offsets using trailing cameraQuat
    const relativeOffset = this.offset.clone().applyQuaternion(this.cameraQuat);
    this.targetCameraPos.copy(aircraft.position).add(relativeOffset);

    // 3. Project lookAt target vector slightly in front of flight direction
    const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(aircraft.group.quaternion);
    this.targetLookAt.copy(aircraft.position).addScaledVector(forwardDir, this.lookAheadDistance);

    if (this.isFirstFrame) {
      camera.position.copy(this.targetCameraPos);
      this.currentLookAt.copy(this.targetLookAt);
      camera.lookAt(this.currentLookAt);
      this.isFirstFrame = false;
    } else {
      // Position tracking interpolation (LERP) coefficient
      const lerpFactor = 1.0 - Math.exp(-this.lerpSpeed * deltaTime);

      // Interpolate position and focus vectors smoothly
      camera.position.lerp(this.targetCameraPos, lerpFactor);
      this.currentLookAt.lerp(this.targetLookAt, lerpFactor);
      camera.lookAt(this.currentLookAt);
    }
  }

  updateMenuOrbit(aircraft, camera, deltaTime) {
    // Slow orbital sweep around the stationary parked aircraft (0.15 rads per sec)
    this.orbitAngle += 0.15 * deltaTime;
    const orbitRadius = 14.0;
    const orbitHeight = 2.8;

    // Position coordinates calculated along orbit circle
    this.targetCameraPos.set(
      aircraft.position.x + Math.sin(this.orbitAngle) * orbitRadius,
      aircraft.position.y + orbitHeight,
      aircraft.position.z + Math.cos(this.orbitAngle) * orbitRadius
    );

    this.targetLookAt.copy(aircraft.position).add(new THREE.Vector3(0, 0.4, 0));

    if (this.isFirstFrame) {
      camera.position.copy(this.targetCameraPos);
      this.currentLookAt.copy(this.targetLookAt);
      camera.lookAt(this.currentLookAt);
      this.isFirstFrame = false;
    } else {
      // Interpolate smoothly to current coordinates, permitting camera transitions when launching
      camera.position.lerp(this.targetCameraPos, 8.0 * deltaTime);
      this.currentLookAt.lerp(this.targetLookAt, 8.0 * deltaTime);
      camera.lookAt(this.currentLookAt);
    }
  }
}