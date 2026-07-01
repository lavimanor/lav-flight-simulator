import * as THREE from 'three';
import { Noise } from '../utils/Noise.js';

export class TerrainManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.noise = new Noise(12345); // Deterministic terrain seed

    // Operational parameters
    this.chunkSize = 4000;         
    this.chunkSegments = 32;       
    this.maxElevation = 700;       
    this.noiseScale = 0.00015;     

    this.chunks = new Map();       // Key: "chunkX,chunkZ" -> value: { mesh }
    this.activeCoords = new THREE.Vector2(); 
    this.runwayGroup = null;       // Procedural runway geometries container
  }

  init(engine) {
    this.engine = engine;
    this.createRunway();
  }

  createRunway() {
    const scene = this.engine.scene;

    // 1. Asphalt Runway strip (Length: 3000m, Width: 60m, Altitude: 180.02m to match plateau Y=180.0m)
    const rwWidth = 60;
    const rwLength = 3000;
    const rwGeo = new THREE.PlaneGeometry(rwWidth, rwLength);
    rwGeo.rotateX(-Math.PI / 2); // Lay flat on the plateau surface (Y = 180)

    const rwMat = new THREE.MeshStandardMaterial({
      color: 0x1d2126, // Deep black asphalt
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });

    const runway = new THREE.Mesh(rwGeo, rwMat);
    runway.position.set(0, 180.02, 500); // Shift to Y=180.02m (exactly 2cm above the 180m plateau to prevent clipping)
    runway.receiveShadow = true;
    runway.castShadow = false;
    runway.name = "runway";
    scene.add(runway);

    // 2. Centerline Painted Stripes (Procedural Dash marks)
    const linesGroup = new THREE.Group();
    const dashGeo = new THREE.PlaneGeometry(2, 20); // 2m wide, 20m long paint segments
    dashGeo.rotateX(-Math.PI / 2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffea00 }); // Yellow centerline dashes

    for (let z = -900; z <= 1900; z += 120) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.position.set(0, 180.05, z); // Position at Y=180.05m
      linesGroup.add(dash);
    }

    // 3. Threshold stripe blocks at ends (Positioned at Y=180.05m to align with runway surface)
    const thresholdGeo = new THREE.PlaneGeometry(rwWidth - 10, 4);
    thresholdGeo.rotateX(-Math.PI / 2);
    const thresholdMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });

    const thresholdStart = new THREE.Mesh(thresholdGeo, thresholdMat);
    thresholdStart.position.set(0, 180.05, -980); 
    linesGroup.add(thresholdStart);

    const thresholdEnd = new THREE.Mesh(thresholdGeo, thresholdMat);
    thresholdEnd.position.set(0, 180.05, 1980); 
    linesGroup.add(thresholdEnd);

    scene.add(linesGroup);
    this.runwayGroup = linesGroup;
  }

  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }

    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

    const aircraftPos = this.aircraftManager.activeAircraft.position;

    // Calculate current chunk indices under the aircraft
    const cx = Math.floor((aircraftPos.x + this.chunkSize / 2) / this.chunkSize);
    const cz = Math.floor((aircraftPos.z + this.chunkSize / 2) / this.chunkSize);

    // Re-verify if aircraft crossed sector boundaries to reload chunks
    if (cx !== this.activeCoords.x || cz !== this.activeCoords.y || this.chunks.size === 0) {
      this.activeCoords.set(cx, cz);
      this.updateActiveTerrain(cx, cz);
    }
  }

  updateActiveTerrain(centerX, centerZ) {
    const scene = this.engine.scene;
    const viewRadius = 1; 
    const activeKeys = new Set();

    for (let dx = -viewRadius; dx <= viewRadius; dx++) {
      for (let dz = -viewRadius; dz <= viewRadius; dz++) {
        const cx = centerX + dx;
        const cz = centerZ + dz;
        const key = `${cx},${cz}`;
        activeKeys.add(key);

        if (!this.chunks.has(key)) {
          this.generateChunk(cx, cz, key);
        }
      }
    }

    for (const [key, chunk] of this.chunks.entries()) {
      if (!activeKeys.has(key)) {
        scene.remove(chunk.mesh);
        chunk.geometry.dispose();
        chunk.material.dispose();
        this.chunks.delete(key);
      }
    }
  }

  generateChunk(cx, cz, key) {
    const scene = this.engine.scene;

    const geometry = new THREE.PlaneGeometry(this.chunkSize, this.chunkSize, this.chunkSegments, this.chunkSegments);
    geometry.rotateX(-Math.PI / 2); 

    const chunkWorldX = cx * this.chunkSize;
    const chunkWorldZ = cz * this.chunkSize;

    const positions = geometry.attributes.position;
    const colors = [];
    const waterLevel = 135.0; // Synced mean sea level

    for (let i = 0; i < positions.count; i++) {
      const vx = positions.getX(i) + chunkWorldX;
      const vz = positions.getZ(i) + chunkWorldZ;

      // Evaluate elevation using deterministic multi-octave fBm (with airport flat-corridor check)
      const height = this.getHeightAt(vx, vz);
      positions.setY(i, height);

      // Procedural height-based color bands
      const color = new THREE.Color();
      if (height < waterLevel + 4.0) {
        // Sand beach coastline zone
        color.setHex(0xd2b48c);
      } else if (height < 210) {
        // Lush green valleys
        const t = (height - (waterLevel + 4.0)) / (210 - (waterLevel + 4.0));
        color.lerpColors(new THREE.Color(0x283e20), new THREE.Color(0x3e522b), t);
      } else if (height < 420) {
        // Rocky mountain slopes
        const t = (height - 210) / 210;
        color.lerpColors(new THREE.Color(0x3e522b), new THREE.Color(0x5c503b), t);
      } else {
        // Snowy peaks
        const t = Math.min((height - 420) / 180, 1.0);
        color.lerpColors(new THREE.Color(0x5c503b), new THREE.Color(0xffffff), t);
      }
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true 
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(chunkWorldX, 0, chunkWorldZ);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    scene.add(mesh);

    this.chunks.set(key, { mesh, geometry, material });
  }

  /**
   * Resolves elevation height with flat Hermite-blended corridor flattening for the Runway (Plateau Y=180.0m)
   * Incorporates a power-curve algorithm to sharpen peaks and flatten valleys.
   * @param {number} worldX 
   * @param {number} worldZ 
   * @returns {number} Height
   */
  getHeightAt(worldX, worldZ) {
    const scale = this.noiseScale;
    const n = this.noise.fbm2D(worldX * scale, worldZ * scale, 4);

    // Apply a power curve ratio to widen valley floors and sharpen peaks (thermodynamic ridge erosion)
    const adjustedHeight = Math.pow(n, 1.4) * this.maxElevation;

    // Hermite-Smoothed Airport Corridor:
    // Blends terrain smoothly toward flat Y=180m airfield plateau.
    const distToCenter = Math.abs(worldX);
    if (worldZ > -1500 && worldZ < 2500) {
      const airfieldElevation = 180.0; // Raise Runway plateau to 180 meters to prevent mountain peak clipping
      
      if (distToCenter < 80) {
        return airfieldElevation; 
      } else if (distToCenter < 600) {
        // Smooth transition over 520 meters
        const t = (distToCenter - 80) / 520;
        const smoothT = t * t * (3 - 2 * t);
        return THREE.MathUtils.lerp(airfieldElevation, adjustedHeight, smoothT);
      }
    }
    return adjustedHeight;
  }
}