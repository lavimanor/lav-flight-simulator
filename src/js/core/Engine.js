import * as THREE from 'three';

export class Engine {
  constructor() {
    this.container = document.getElementById('canvas-container');
    if (!this.container) {
      throw new Error("Unable to locate canvas container (#canvas-container) in target DOM.");
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    // Use standard, high-precision performance.now() to bypass THREE.Clock deprecation warnings
    this.lastTime = performance.now(); 
    this.modules = [];

    this.init();
  }

  init() {
    // 1. Scene Initialization
    this.scene = new THREE.Scene();

    // 2. Camera Framework
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      50000
    );
    this.camera.position.set(0, 10, 25);
    this.camera.lookAt(0, 0, 0);

    // 3. Rendering Context
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 4. Window Event Hooks
    this.resizeHandler = () => this.onWindowResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  onWindowResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addModule(module) {
    this.modules.push(module);
  }

  start() {
    this.renderer.setAnimationLoop(() => this.tick());
  }

  tick() {
    const currentTime = performance.now();
    // Calculate high-precision frame delta in seconds
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Tick over active updates for registered system modules
    for (const module of this.modules) {
      if (typeof module.update === 'function') {
        module.update(deltaTime);
      }
    }

    // Render frame
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}