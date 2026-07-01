import * as THREE from 'three';

export class WeatherManager {
  constructor() {
    this.engine = null;
    this.activeWeatherId = 'clear';

    // Core physical vectors
    this.wind = new THREE.Vector3(0, 0, 0);             // Sustained wind (m/s)
    this.currentGust = new THREE.Vector3(0, 0, 0);      // High-frequency turbulence offsets
    this.turbulenceIntensity = 0.0;                     // 0.0 (calm) to 1.0 (severe)

    // Rain Particle registers
    this.rainCount = 2000;
    this.rainParticles = null;
    this.rainGeometry = null;
    this.rainVelocity = -80.0; // Falling speed (m/s)
    this.particleBounds = 150; // Size of local tracking volume box
  }

  init(engine) {
    this.engine = engine;
    this.buildRainSystem();
    this.setWeather('clear'); // Initialize clear weather on start
  }

  buildRainSystem() {
    const scene = this.engine.scene;

    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);

    // Scatter particles randomly inside the bounding box
    for (let i = 0; i < this.rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * this.particleBounds * 2;
      positions[i + 1] = (Math.random() - 0.5) * this.particleBounds * 2;
      positions[i + 2] = (Math.random() - 0.5) * this.particleBounds * 2;
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Semi-translucent glowing blue-grey rain drop texture material
    const material = new THREE.PointsMaterial({
      color: 0x8ab2c9,
      size: 0.6,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });

    this.rainParticles = new THREE.Points(this.rainGeometry, material);
    this.rainParticles.visible = false;
    scene.add(this.rainParticles);
  }

  setWeather(weatherId) {
    const scene = this.engine.scene;
    this.activeWeatherId = weatherId;

    // Lookup Environment lights to adjust atmosphere brightness
    const envManager = this.engine.moduleManager.get('Environment');

    switch (weatherId) {
      case 'clear':
        this.wind.set(0, 0, 0);
        this.turbulenceIntensity = 0.0;
        if (this.rainParticles) this.rainParticles.visible = false;

        // Warm bright daylight transition
        scene.background.setHex(0x87b5ff);
        scene.fog.color.setHex(0x87b5ff);
        scene.fog.density = 0.00012;
        if (envManager) {
          if (envManager.hemisphereLight) envManager.hemisphereLight.intensity = 0.6;
          if (envManager.sunLight) envManager.sunLight.intensity = 1.2;
        }
        break;

      case 'windy':
        this.wind.set(12.0, 0, -6.0); // Constant 25 knots cross-headwind
        this.turbulenceIntensity = 0.4;
        if (this.rainParticles) this.rainParticles.visible = false;

        // Hazy, overcast silver sky transition
        scene.background.setHex(0xa9b8c2);
        scene.fog.color.setHex(0xa9b8c2);
        scene.fog.density = 0.00028;
        if (envManager) {
          if (envManager.hemisphereLight) envManager.hemisphereLight.intensity = 0.45;
          if (envManager.sunLight) envManager.sunLight.intensity = 0.7;
        }
        break;

      case 'stormy':
        this.wind.set(22.0, -1.5, -12.0); // Severe 45 knots storm shears & microbursts
        this.turbulenceIntensity = 1.0;
        if (this.rainParticles) this.rainParticles.visible = true;

        // Dark overcast storm clouds transition
        scene.background.setHex(0x2a3138);
        scene.fog.color.setHex(0x2a3138);
        scene.fog.density = 0.00065; // Heavy visibility dampening
        if (envManager) {
          if (envManager.hemisphereLight) envManager.hemisphereLight.intensity = 0.2;
          if (envManager.sunLight) envManager.sunLight.intensity = 0.15; // Darkened solar intensity
        }
        break;
    }

    console.log(`[WeatherManager] Weather shifted to: ${weatherId.toUpperCase()}`);
  }

  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;

    // 1. Calculate dynamic, high-frequency turbulence vector based on weather state
    if (this.turbulenceIntensity > 0) {
      const time = performance.now() * 0.006;
      // Multi-frequency wave combinations to synthesize natural chaotic turbulence gusts
      const gx = Math.sin(time * 3.1) * Math.cos(time * 1.7) * this.turbulenceIntensity * 2.5;
      const gy = Math.cos(time * 2.3) * Math.sin(time * 4.1) * this.turbulenceIntensity * 1.5;
      const gz = Math.sin(time * 1.9) * Math.cos(time * 3.3) * this.turbulenceIntensity * 2.0;

      this.currentGust.set(gx, gy, gz);
    } else {
      this.currentGust.set(0, 0, 0);
    }

    // 2. Animate and wrap rain particles around camera coordinate viewport
    if (this.rainParticles && this.rainParticles.visible) {
      const camera = this.engine.camera;
      this.rainParticles.position.copy(camera.position);

      const positions = this.rainGeometry.attributes.position;

      for (let i = 0; i < this.rainCount * 3; i += 3) {
        // Apply falling rain velocities and horizontal wind drift
        positions.array[i + 1] += this.rainVelocity * deltaTime;                    // Y coordinate
        positions.array[i]     += (this.wind.x + this.currentGust.x) * deltaTime;     // X coordinate
        positions.array[i + 2] += (this.wind.z + this.currentGust.z) * deltaTime;     // Z coordinate

        // Wrap rain particles back to boundary limits if they travel outside the tracking box volume
        if (positions.array[i + 1] < -this.particleBounds) {
          positions.array[i + 1] = this.particleBounds;
          positions.array[i] = (Math.random() - 0.5) * this.particleBounds * 2;
          positions.array[i + 2] = (Math.random() - 0.5) * this.particleBounds * 2;
        }
      }

      positions.needsUpdate = true;
    }
  }
}