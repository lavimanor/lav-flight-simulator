import * as THREE from 'three';

export class EnvironmentManager {
  constructor() {
    this.engine = null;
    this.sunLight = null;
    this.ambientLight = null;
    this.hemisphereLight = null;
  }

  init(engine) {
    this.engine = engine;
    const scene = engine.scene;

    // 1. Atmosphere and Sky Colors
    const skyColor = 0x87b5ff;      
    const groundColor = 0x3d4f30;   // Dark green reflection
    scene.background = new THREE.Color(skyColor);

    // Exponential fog simulates realistic atmospheric density and softens the horizon
    scene.fog = new THREE.FogExp2(skyColor, 0.00012);

    // 2. Lighting Setup
    // Hemisphere light blends natural sky light with ground bounce light
    this.hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, 0.6);
    scene.add(this.hemisphereLight);

    // Sun light for directional illumination and crisp shadows
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.sunLight.position.set(500, 1000, 500);
    this.sunLight.castShadow = true;

    // Shadow map tuning optimized for flight sim scale
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 5000;

    // Orthographic boundaries for shadows
    const shadowBound = 250;
    this.sunLight.shadow.camera.left = -shadowBound;
    this.sunLight.shadow.camera.right = shadowBound;
    this.sunLight.shadow.camera.top = shadowBound;
    this.sunLight.shadow.camera.bottom = -shadowBound;
    this.sunLight.shadow.bias = -0.0005;

    scene.add(this.sunLight);

    // Low-intensity ambient light prevents unlit pitch-black shadows
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(this.ambientLight);
  }

  update(deltaTime) {
    // Dynamic sun rotation loops can be safely configured here
  }
}