import * as THREE from 'three';

export class EnvironmentManager {
  constructor() {
    this.engine = null;
    this.sunLight = null;
    this.ambientLight = null;
    this.hemisphereLight = null;
    this.sunTarget = null;
    this.aircraftManager = null;

    // Fixed sun direction offset; the light rig slides to follow the aircraft so shadows stay in view.
    this.sunOffset = new THREE.Vector3(500, 1000, 500);
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
    this.sunLight.position.copy(this.sunOffset);
    this.sunLight.castShadow = true;

    // Explicit target so the light (and its shadow frustum) can be re-aimed at the aircraft each frame
    this.sunTarget = new THREE.Object3D();
    scene.add(this.sunTarget);
    this.sunLight.target = this.sunTarget;

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
    if (!this.engine || !this.engine.moduleManager) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

    // Slide the sun rig so the shadow frustum keeps covering the aircraft (shadow bounds are only ±250m).
    const pos = this.aircraftManager.activeAircraft.position;
    if (this.sunTarget) this.sunTarget.position.copy(pos);
    if (this.sunLight) this.sunLight.position.copy(pos).add(this.sunOffset);
  }
}