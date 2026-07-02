import * as THREE from 'three';
export class WeatherManager {
  constructor() {
    this.engine = null;
    this.activeWeatherId = 'clear';
    this.wind = new THREE.Vector3(0, 0, 0);
    this.currentGust = new THREE.Vector3(0, 0, 0);
    this.turbulenceIntensity = 0.0;
    this.rainCount = 2000;
    this.rainParticles = null;
    this.rainGeometry = null;
    this.rainVelocity = -80.0;
    this.particleBounds = 150;
  }
  init(engine) {
    this.engine = engine;
    this.buildRainSystem();
    this.setWeather('clear');
  }
  buildRainSystem() {
    const scene = this.engine.scene;
    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    for (let i = 0; i < this.rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * this.particleBounds * 2;
      positions[i + 1] = (Math.random() - 0.5) * this.particleBounds * 2;
      positions[i + 2] = (Math.random() - 0.5) * this.particleBounds * 2;
    }
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
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
    const envManager = this.engine.moduleManager.get('Environment');
    switch (weatherId) {
      case 'clear':
        this.wind.set(0, 0, 0);
        this.turbulenceIntensity = 0.0;
        if (this.rainParticles) this.rainParticles.visible = false;
        scene.background.setHex(0x87b5ff);
        scene.fog.color.setHex(0x87b5ff);
        scene.fog.density = 0.00012;
        if (envManager) {
          if (envManager.hemisphereLight) envManager.hemisphereLight.intensity = 0.6;
          if (envManager.sunLight) envManager.sunLight.intensity = 1.2;
        }
        break;
      case 'windy':
        this.wind.set(12.0, 0, -6.0);
        this.turbulenceIntensity = 0.4;
        if (this.rainParticles) this.rainParticles.visible = false;
        scene.background.setHex(0xa9b8c2);
        scene.fog.color.setHex(0xa9b8c2);
        scene.fog.density = 0.00028;
        if (envManager) {
          if (envManager.hemisphereLight) envManager.hemisphereLight.intensity = 0.45;
          if (envManager.sunLight) envManager.sunLight.intensity = 0.7;
        }
        break;
      case 'stormy':
        this.wind.set(22.0, -1.5, -12.0);
        this.turbulenceIntensity = 1.0;
        if (this.rainParticles) this.rainParticles.visible = true;
        scene.background.setHex(0x2a3138);
        scene.fog.color.setHex(0x2a3138);
        scene.fog.density = 0.00065;
        if (envManager) {
          if (envManager.hemisphereLight) envManager.hemisphereLight.intensity = 0.2;
          if (envManager.sunLight) envManager.sunLight.intensity = 0.15;
        }
        break;
    }
    console.log(`[WeatherManager] Weather shifted to: ${weatherId.toUpperCase()}`);
  }
  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;
    if (this.turbulenceIntensity > 0) {
      const time = performance.now() * 0.006;
      const gx = Math.sin(time * 3.1) * Math.cos(time * 1.7) * this.turbulenceIntensity * 2.5;
      const gy = Math.cos(time * 2.3) * Math.sin(time * 4.1) * this.turbulenceIntensity * 1.5;
      const gz = Math.sin(time * 1.9) * Math.cos(time * 3.3) * this.turbulenceIntensity * 2.0;
      this.currentGust.set(gx, gy, gz);
    } else {
      this.currentGust.set(0, 0, 0);
    }
    if (this.rainParticles && this.rainParticles.visible) {
      const camera = this.engine.camera;
      this.rainParticles.position.copy(camera.position);
      const positions = this.rainGeometry.attributes.position;
      for (let i = 0; i < this.rainCount * 3; i += 3) {
        positions.array[i + 1] += this.rainVelocity * deltaTime;
        positions.array[i]     += (this.wind.x + this.currentGust.x) * deltaTime;
        positions.array[i + 2] += (this.wind.z + this.currentGust.z) * deltaTime;
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