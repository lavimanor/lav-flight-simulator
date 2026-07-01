import * as THREE from 'three';

export class WaterManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.waterMesh = null;
    this.waterLevel = 135.0; // Mean sea level (meters)
  }

  init(engine) {
    this.engine = engine;
    const scene = engine.scene;

    // 1. Create a large low-poly circular water geometry
    const waterGeo = new THREE.PlaneGeometry(32000, 32000, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);

    // 2. High-performance reflective water material (low-metalness to show rich blue-teal diffuse color)
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0077be,         // Brighter, vibrant ocean blue
      roughness: 0.3,          // Moderate roughness to diffuse hemisphere lighting
      metalness: 0.1,          // Low metalness to prevent empty black reflections
      transparent: true,
      opacity: 0.75,           // Semi-translucent coastline blending
      flatShading: true        // Faceted low-poly style matching terrain
    });

    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(0, this.waterLevel, 0);
    this.waterMesh.receiveShadow = true;
    this.waterMesh.name = "water";
    scene.add(this.waterMesh);
  }

  /**
   * Translates the water plane horizontally to track the aircraft coordinate system.
   * @param {number} deltaTime 
   */
  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }

    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

    const aircraftPos = this.aircraftManager.activeAircraft.position;

    if (this.waterMesh) {
      // Offset plane coordinates horizontally to ensure the pilot cannot fly off the water limits
      this.waterMesh.position.x = aircraftPos.x;
      this.waterMesh.position.z = aircraftPos.z;

      // Gentle tidal vertical oscillation taking zero vertex overhead
      const time = performance.now() * 0.0015;
      this.waterMesh.position.y = this.waterLevel + Math.sin(time) * 0.3;
    }
  }
}