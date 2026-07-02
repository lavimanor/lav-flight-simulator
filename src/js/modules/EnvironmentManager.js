import * as THREE from 'three';
export class EnvironmentManager {
  constructor() {
    this.engine = null;
    this.sunLight = null;
    this.ambientLight = null;
    this.hemisphereLight = null;
    this.sunTarget = null;
    this.aircraftManager = null;
    this.sunOffset = new THREE.Vector3(500, 1000, 500);
  }
  init(engine) {
    this.engine = engine;
    const scene = engine.scene;
    const skyColor = 0x87b5ff;
    const groundColor = 0x3d4f30;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, 0.00012);
    this.hemisphereLight = new THREE.HemisphereLight(skyColor, groundColor, 0.6);
    scene.add(this.hemisphereLight);
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    this.sunLight.position.copy(this.sunOffset);
    this.sunLight.castShadow = true;
    this.sunTarget = new THREE.Object3D();
    scene.add(this.sunTarget);
    this.sunLight.target = this.sunTarget;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 5000;
    const shadowBound = 250;
    this.sunLight.shadow.camera.left = -shadowBound;
    this.sunLight.shadow.camera.right = shadowBound;
    this.sunLight.shadow.camera.top = shadowBound;
    this.sunLight.shadow.camera.bottom = -shadowBound;
    this.sunLight.shadow.bias = -0.0005;
    scene.add(this.sunLight);
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(this.ambientLight);
  }
  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;
    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;
    const pos = this.aircraftManager.activeAircraft.position;
    if (this.sunTarget) this.sunTarget.position.copy(pos);
    if (this.sunLight) this.sunLight.position.copy(pos).add(this.sunOffset);
  }
}