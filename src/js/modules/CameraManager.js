import * as THREE from 'three';
import { Atmosphere } from '../physics/Atmosphere.js';

export class CameraManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.currentMode = 'menuOrbit';
    this.offset = new THREE.Vector3(0, 4, -15);
    this.lookAheadDistance = 6.0;
    this.lerpSpeed = 7.5;
    this.cameraSlerpSpeed = 2.2;
    this.isFirstFrame = true;
    this.cameraQuat = new THREE.Quaternion();
    this.targetCameraPos = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();
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
    const camConfig = aircraft.config.camera || { offsetX: 0, offsetY: 4, offsetZ: -15, lookAheadDistance: 6.0 };
    this.offset.set(camConfig.offsetX, camConfig.offsetY, camConfig.offsetZ);
    this.lookAheadDistance = camConfig.lookAheadDistance ?? 6.0;

    const slerpFactor = 1.0 - Math.exp(-this.cameraSlerpSpeed * deltaTime);
    this.cameraQuat.slerp(aircraft.group.quaternion, slerpFactor);

    const relativeOffset = this.offset.clone().applyQuaternion(this.cameraQuat);
    this.targetCameraPos.copy(aircraft.position).add(relativeOffset);

    const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(aircraft.group.quaternion);
    this.targetLookAt.copy(aircraft.position).addScaledVector(forwardDir, this.lookAheadDistance);

    const isJet = aircraft.config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(aircraft.config.id);

    const speedOfSound = Atmosphere.getSpeedOfSound(aircraft.position.y);
    const machNumber = aircraft.airspeed / speedOfSound;
    let transonicBuffet = 0.0;
    if (isJet && machNumber > 0.85 && machNumber < 1.15) {
      transonicBuffet = (1.0 - Math.abs(machNumber - 1.0) / 0.15) * 0.45;
    }

    const gBuffet = Math.max(Math.abs(aircraft.gForce - 1.0) - 3.5, 0.0) * 0.08;
    // Prefer the live stall speed computed by the physics (weight/density aware).
    const stallSpeed = aircraft.stallSpeedIAS ?? aircraft.config.stallSpeed ?? (isJet ? 28.0 : 14.0);
    let stallBuffet = 0.0;

    const terrainManager = this.engine.moduleManager.get('Terrain');
    const terrainHeight = terrainManager ? terrainManager.getHeightAt(aircraft.position.x, aircraft.position.z) : 180.0;

    if (aircraft.indicatedAirspeed < stallSpeed * 1.25 && aircraft.position.y > terrainHeight + 5.0) {
      stallBuffet = (1.0 - Math.min(aircraft.indicatedAirspeed / (stallSpeed * 1.25), 1.0)) * 0.65;
    }

    const settings = this.engine.moduleManager.get('Settings');
    const buffetingActive = settings ? settings.enableCamShake : true;
    // AoA-driven pre-stall buffet from the physics: unlike the IAS proxy above,
    // this also fires in accelerated (high-G) stalls at cruise speed.
    const aoaBuffet = (aircraft.buffetIntensity ?? 0.0) * 0.5;
    const totalBuffet = buffetingActive ? (transonicBuffet + gBuffet + stallBuffet + aoaBuffet) : 0.0;

    const shakeOffset = new THREE.Vector3();
    if (totalBuffet > 0.01) {
      const time = performance.now() * 0.045;
      shakeOffset.set(
        Math.sin(time * 1.7) * totalBuffet * 0.25,
        Math.cos(time * 2.3) * totalBuffet * 0.25,
        Math.sin(time * 3.1) * totalBuffet * 0.18
      );
    }

    if (this.isFirstFrame) {
      camera.position.copy(this.targetCameraPos);
      this.currentLookAt.copy(this.targetLookAt);
      camera.lookAt(this.currentLookAt);
      this.isFirstFrame = false;
    } else {
      const lerpFactor = 1.0 - Math.exp(-this.lerpSpeed * deltaTime);
      camera.position.lerp(this.targetCameraPos, lerpFactor);
      this.currentLookAt.lerp(this.targetLookAt, lerpFactor);

      if (totalBuffet > 0.01) {
        camera.position.add(shakeOffset);
        this.currentLookAt.add(shakeOffset);
      }
      camera.lookAt(this.currentLookAt);
    }
  }

  updateMenuOrbit(aircraft, camera, deltaTime) {
    this.orbitAngle += 0.15 * deltaTime;
    const orbitRadius = 14.0;
    const orbitHeight = 2.8;

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
      // Exponential form so a slow frame (dt > 1/8 s) can't overshoot the target.
      const lerpFactor = 1.0 - Math.exp(-8.0 * deltaTime);
      camera.position.lerp(this.targetCameraPos, lerpFactor);
      this.currentLookAt.lerp(this.targetLookAt, lerpFactor);
      camera.lookAt(this.currentLookAt);
    }
  }
}