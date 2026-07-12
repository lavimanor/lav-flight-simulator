import * as THREE from 'three';
import { AircraftMeshBuilder } from '../../aircraft/AircraftMeshBuilder.js';
import { AircraftConfig } from '../../aircraft/AircraftConfig.js';

export class HangarPreview {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.previewGroup = null;
    this.floorGrid = null;
    this.animationFrameId = null;
    this.canvas = null;
    this.propellerGroup = null;
    this.cargoPropellers = [];
    // Turntable state: auto-rotate, pausing while (and shortly after) the
    // pilot drags the model around with the mouse.
    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerY = 0;
    this.lastDragTime = 0;
    this.tilt = 0.0;
  }

  init() {
    this.canvas = document.getElementById('hangar-preview-canvas');
    if (!this.canvas) return;

    const rect = this.canvas.parentElement.getBoundingClientRect();
    const width = rect.width || 320;
    const height = rect.height || 260;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f14);
    this.scene.fog = new THREE.Fog(0x0a0f14, 14, 26);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 3.2, 10.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x9fb8c8, 0x0c1a10, 0.5);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    // Cool rim light from behind-left plus the signature green fill.
    const rimLight = new THREE.DirectionalLight(0x66aaff, 0.5);
    rimLight.position.set(-12, 6, -14);
    this.scene.add(rimLight);
    const fillLight = new THREE.DirectionalLight(0x00ff66, 0.22);
    fillLight.position.set(-10, -5, -10);
    this.scene.add(fillLight);

    this.previewGroup = new THREE.Group();
    this.scene.add(this.previewGroup);

    // Radar-style turntable floor under the model.
    this.floorGrid = new THREE.PolarGridHelper(5.2, 12, 5, 48, 0x00ff66, 0x0e3a20);
    this.floorGrid.material.transparent = true;
    this.floorGrid.material.opacity = 0.4;
    this.previewGroup.add(this.floorGrid);

    this.bindPointerEvents();
    this.animate();
  }

  bindPointerEvents() {
    if (!this.canvas) return;
    this.canvas.style.cursor = 'grab';
    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.style.cursor = 'grabbing';
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging || !this.previewGroup) return;
      this.previewGroup.rotation.y += (e.clientX - this.lastPointerX) * 0.012;
      this.tilt = THREE.MathUtils.clamp(this.tilt + (e.clientY - this.lastPointerY) * 0.006, -0.5, 0.6);
      this.previewGroup.rotation.x = this.tilt;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.lastDragTime = performance.now();
    });
    const endDrag = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.lastDragTime = performance.now();
      if (e.pointerId !== undefined && this.canvas.hasPointerCapture(e.pointerId)) {
        this.canvas.releasePointerCapture(e.pointerId);
      }
      this.canvas.style.cursor = 'grab';
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);
  }

  // Match the renderer to the canvas container's current layout size. Needed
  // because the modal is display:none at init time (zero-sized rects).
  resize() {
    if (!this.renderer || !this.canvas || !this.canvas.parentElement) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }

  setAircraft(configId) {
    if (!this.scene) return;

    const activeConfig = AircraftConfig[configId];
    if (!activeConfig) {
      console.warn(`[HangarPreview] Configuration for '${configId}' is not loaded yet. Deferring rendering.`);
      return;
    }

    // Remove the previous model but keep the floor grid.
    for (const child of [...this.previewGroup.children]) {
      if (child !== this.floorGrid) this.previewGroup.remove(child);
    }

    this.propellerGroup = null;
    this.cargoPropellers = [];

    const mockAircraft = {
      config: activeConfig,
      group: new THREE.Group(),
      gearGroup: new THREE.Group()
    };
    mockAircraft.group.add(mockAircraft.gearGroup);

    AircraftMeshBuilder.build(mockAircraft);

    if (mockAircraft.propellerGroup) {
      this.propellerGroup = mockAircraft.propellerGroup;
    }
    if (mockAircraft.cargoPropellers) {
      this.cargoPropellers = mockAircraft.cargoPropellers;
    }

    // Fit-to-view: models are built at true physical size (a 52 m B-2 and a
    // 6 m stunt plane), so frame each one by its bounding box instead of
    // hand-tuned magic scales.
    mockAircraft.group.rotation.set(0.10, -Math.PI / 4, -0.03);
    const bbox = new THREE.Box3().setFromObject(mockAircraft.group);
    const size = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0.001 ? 7.0 / maxDim : 1.0;
    mockAircraft.group.scale.setScalar(scale);
    const center = bbox.getCenter(new THREE.Vector3());
    mockAircraft.group.position.copy(center).multiplyScalar(-scale);

    // Rest the turntable grid just below the scaled model.
    if (this.floorGrid) {
      this.floorGrid.position.y = (bbox.min.y - center.y) * scale - 0.25;
    }

    this.previewGroup.add(mockAircraft.group);
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Auto-rotate resumes a moment after the pilot lets go of the model.
    const idle = !this.isDragging && (performance.now() - this.lastDragTime > 1800);
    if (this.previewGroup && idle) {
      this.previewGroup.rotation.y += 0.008;
      // Ease the drag tilt back to level.
      this.tilt *= 0.97;
      this.previewGroup.rotation.x = this.tilt;
    }

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
