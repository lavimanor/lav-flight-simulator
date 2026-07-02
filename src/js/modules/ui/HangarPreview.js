import * as THREE from 'three';
import { AircraftMeshBuilder } from '../../aircraft/AircraftMeshBuilder.js';
import { AircraftConfig } from '../../aircraft/AircraftConfig.js';

export class HangarPreview {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.previewGroup = null;
    this.animationFrameId = null;
    this.canvas = null;
    this.propellerGroup = null;
    this.cargoPropellers = [];
  }

  init() {
    this.canvas = document.getElementById('hangar-preview-canvas');
    if (!this.canvas) return;

    const rect = this.canvas.parentElement.getBoundingClientRect();
    const width = rect.width || 240;
    const height = rect.height || 200;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f14);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 4, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x00ff66, 0.25); // Soft sci-fi neon green ground fill
    fillLight.position.set(-10, -5, -10);
    this.scene.add(fillLight);

    this.previewGroup = new THREE.Group();
    this.scene.add(this.previewGroup);

    this.animate();
  }

  /**
   * Clears old models and procedurally builds the highlighted aircraft in mock state.
   * @param {string} configId 
   */
  setAircraft(configId) {
    if (!this.scene) return;

    // Safety check: if configurations are still loading asynchronously, defer rendering [3]
    const activeConfig = AircraftConfig[configId];
    if (!activeConfig) {
      console.warn(`[HangarPreview] Configuration for '${configId}' is not loaded yet. Deferring rendering.`);
      return;
    }

    // Clear previous mesh groups
    while (this.previewGroup.children.length > 0) {
      const child = this.previewGroup.children[0];
      this.previewGroup.remove(child);
    }

    this.propellerGroup = null;
    this.cargoPropellers = [];

    // Assemble mock aircraft structure
    const mockAircraft = {
      config: activeConfig,
      group: new THREE.Group(),
      gearGroup: new THREE.Group()
    };
    mockAircraft.group.add(mockAircraft.gearGroup);

    if (mockAircraft.config.id === 'fighter') {
      mockAircraft.afterburnerGroup = new THREE.Group();
      mockAircraft.group.add(mockAircraft.afterburnerGroup);
    }

    // Procedurally render raw mesh
    AircraftMeshBuilder.build(mockAircraft);

    // Save propeller references for preview animations
    if (mockAircraft.propellerGroup) {
      this.propellerGroup = mockAircraft.propellerGroup;
    }
    if (mockAircraft.cargoPropellers) {
      this.cargoPropellers = mockAircraft.cargoPropellers;
    }

    // Scale models so they look consistently centered in the viewport
    const scale = configId === 'cargo' ? 0.35 : (configId === 'fighter' ? 0.65 : 0.8);
    mockAircraft.group.scale.set(scale, scale, scale);
    
    // Tilt slightly forward/side for cinematic angle
    mockAircraft.group.rotation.set(0.15, -Math.PI / 4, -0.05);

    this.previewGroup.add(mockAircraft.group);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.previewGroup) {
      this.previewGroup.rotation.y += 0.008;
    }

    // Spin preview propellers
    const time = performance.now() * 0.005;
    if (this.propellerGroup) {
      this.propellerGroup.rotation.z = time;
    }
    this.cargoPropellers.forEach((prop) => {
      prop.rotation.z = time;
    });

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}