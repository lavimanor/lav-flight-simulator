import * as THREE from 'three';
import { Noise } from '../utils/Noise.js';

export class TerrainManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.noise = new Noise(12345);
    this.chunkSize = 4000;
    this.chunkSegments = 32;
    this.maxElevation = 700;
    this.noiseScale = 0.00015;
    this.chunks = new Map();
    this.activeCoords = new THREE.Vector2();
    this.runwayGroup = null;
  }
  init(engine) {
    this.engine = engine;
    this.createRunway();
    this.createRunwayLights();
  }
  createRunway() {
    const scene = this.engine.scene;
    const rwWidth = 60;
    const rwLength = 3000;
    const rwGeo = new THREE.PlaneGeometry(rwWidth, rwLength);
    rwGeo.rotateX(-Math.PI / 2);
    const rwMat = new THREE.MeshStandardMaterial({
      color: 0x1d2126,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true
    });
    const runway = new THREE.Mesh(rwGeo, rwMat);
    runway.position.set(0, 180.02, 500);
    runway.receiveShadow = true;
    runway.castShadow = false;
    runway.name = "runway";
    scene.add(runway);
    const linesGroup = new THREE.Group();
    const dashGeo = new THREE.PlaneGeometry(2, 20);
    dashGeo.rotateX(-Math.PI / 2);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    for (let z = -900; z <= 1900; z += 120) {
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.position.set(0, 180.05, z);
      linesGroup.add(dash);
    }
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
  createRunwayLights() {
    const scene = this.engine.scene;
    const edgePositions = [];
    const greenPositions = [];
    const redPositions = [];
    const alsPositions = [];
    const yPos = 180.12;
    for (let z = -980; z <= 1980; z += 40) {
      edgePositions.push(-30, yPos, z);
      edgePositions.push(30, yPos, z);
    }
    for (let x = -30; x <= 30; x += 6) {
      greenPositions.push(x, yPos, -980);
    }
    for (let x = -30; x <= 30; x += 6) {
      redPositions.push(x, yPos, 1980);
    }
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568,
      roughness: 0.82,
      metalness: 0.10,
      flatShading: true
    });
    const checkAndBuildSupportPillar = (x, z) => {
      const groundHeight = this.getHeightAt(x, z);
      if (groundHeight < 179.5) {
        const pillarHeight = 180.0 - groundHeight;
        const pillarGeo = new THREE.CylinderGeometry(0.22, 0.35, pillarHeight, 6);
        const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
        pillarMesh.position.set(x, groundHeight + pillarHeight / 2, z);
        pillarMesh.castShadow = true;
        pillarMesh.receiveShadow = true;
        scene.add(pillarMesh);
      }
    };
    for (let z = -1040; z >= -1580; z -= 60) {
      alsPositions.push(0, yPos, z);
      checkAndBuildSupportPillar(0, z);
      redPositions.push(-15, yPos, z);
      checkAndBuildSupportPillar(-15, z);
      redPositions.push(15, yPos, z);
      checkAndBuildSupportPillar(15, z);
    }
    const whiteTexture = this.createGlowTexture('#ffffff');
    const greenTexture = this.createGlowTexture('#00ff66');
    const redTexture = this.createGlowTexture('#ff3333');
    this.addPointsLightGroup(scene, edgePositions, whiteTexture, 6.0, 0.45);
    this.addPointsLightGroup(scene, alsPositions, whiteTexture, 8.0, 0.65);
    this.addPointsLightGroup(scene, greenPositions, greenTexture, 7.0, 0.55);
    this.addPointsLightGroup(scene, redPositions, redTexture, 7.0, 0.55);
  }
  createGlowTexture(colorHexStr) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, colorHexStr);
    gradient.addColorStop(0.3, colorHexStr);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  addPointsLightGroup(scene, posArray, texture, size, opacity) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArray, 3));
    const mat = new THREE.PointsMaterial({
      size: size,
      map: texture,
      transparent: true,
      opacity: opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
  }
  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;
    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;
    const aircraftPos = this.aircraftManager.activeAircraft.position;
    const cx = Math.floor((aircraftPos.x + this.chunkSize / 2) / this.chunkSize);
    const cz = Math.floor((aircraftPos.z + this.chunkSize / 2) / this.chunkSize);
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
    const waterLevel = 135.0;
    for (let i = 0; i < positions.count; i++) {
      const vx = positions.getX(i) + chunkWorldX;
      const vz = positions.getZ(i) + chunkWorldZ;
      const height = this.getHeightAt(vx, vz);
      positions.setY(i, height);
      const color = new THREE.Color();
      if (height < waterLevel + 4.0) {
        color.setHex(0xd2b48c);
      } else if (height < 210) {
        const t = (height - (waterLevel + 4.0)) / (210 - (waterLevel + 4.0));
        color.lerpColors(new THREE.Color(0x283e20), new THREE.Color(0x3e522b), t);
      } else if (height < 420) {
        const t = (height - 210) / 210;
        color.lerpColors(new THREE.Color(0x3e522b), new THREE.Color(0x5c503b), t);
      } else {
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
  getHeightAt(worldX, worldZ) {
    const scale = this.noiseScale;
    const n = this.noise.fbm2D(worldX * scale, worldZ * scale, 4);
    const adjustedHeight = Math.pow(n, 1.4) * this.maxElevation;
    const distToCenter = Math.abs(worldX);
    if (worldZ > -1500 && worldZ < 2500) {
      const airfieldElevation = 180.0;
      if (distToCenter < 80) {
        return airfieldElevation;
      } else if (distToCenter < 600) {
        const t = (distToCenter - 80) / 520;
        const smoothT = t * t * (3 - 2 * t);
        return THREE.MathUtils.lerp(airfieldElevation, adjustedHeight, smoothT);
      }
    }
    return adjustedHeight;
  }
}