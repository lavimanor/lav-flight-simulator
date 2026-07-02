import * as THREE from 'three';

export class ObstacleManager {
  constructor() {
    this.engine = null;
    this.obstacles = [];
    this.rings = [];
    this.clearedRingsCount = 0;
    this.totalRings = 4;
    this.clearedStatus = [false, false, false, false];
    this.alertTimeout = null;
  }

  init(engine) {
    this.engine = engine;
    this.spawnObstacles();
    this.spawnStuntRings();
    this.resetCourse();
  }

  resetCourse() {
    this.clearedRingsCount = 0;
    this.clearedStatus = [false, false, false, false];
    
    // Reset visual color of rings back to neon blue
    this.rings.forEach((ring) => {
      if (ring.mesh && ring.mesh.material) {
        ring.mesh.material.color.setHex(0x00d2ff);
        ring.mesh.material.emissive.setHex(0x0033aa);
      }
    });

    const display = document.getElementById('hud-rings-val');
    if (display) {
      display.textContent = `0 / ${this.totalRings}`;
    }
  }

  spawnObstacles() {
    const scene = this.engine.scene;

    // Materials
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x00d2ff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.6 });
    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.7 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 0.5 });

    // 1. Control Tower (X = -75, Z = 300, base Y = 180)
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-75, 180, 300);

    // Tower Shaft (Cylinder radius 4m, height 40m)
    const shaftGeo = new THREE.CylinderGeometry(4, 5, 40, 8);
    shaftGeo.translate(0, 20, 0); // Bottom at Y=0
    const shaft = new THREE.Mesh(shaftGeo, towerMat);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    towerGroup.add(shaft);

    // Tower Cab (Cylinder radius 6.5m, height 8m)
    const cabGeo = new THREE.CylinderGeometry(6.5, 5.5, 8, 8);
    cabGeo.translate(0, 44, 0);
    const cab = new THREE.Mesh(cabGeo, glassMat);
    cab.castShadow = true;
    towerGroup.add(cab);

    // Tower Roof (Cone radius 7m, height 3m)
    const roofGeo = new THREE.ConeGeometry(7, 3, 8);
    roofGeo.translate(0, 49.5, 0);
    const roof = new THREE.Mesh(roofGeo, trimMat);
    roof.castShadow = true;
    towerGroup.add(roof);

    scene.add(towerGroup);

    // Add to obstacles list for box collision check
    this.obstacles.push({
      type: 'box',
      min: new THREE.Vector3(-85, 180, 290),
      max: new THREE.Vector3(-65, 232, 310),
      name: 'Control Tower'
    });

    // 2. Hangar A (X = -120, Z = -100, Base Y = 180)
    const hangarAGroup = new THREE.Group();
    hangarAGroup.position.set(-120, 180, -100);

    const hangarGeo = new THREE.BoxGeometry(50, 25, 60);
    hangarGeo.translate(0, 12.5, 0);
    const hangarA = new THREE.Mesh(hangarGeo, hangarMat);
    hangarA.castShadow = true;
    hangarA.receiveShadow = true;
    hangarAGroup.add(hangarA);

    // Arching roof trim
    const roofTrimGeo = new THREE.CylinderGeometry(25, 25, 60.2, 16, 1, false, 0, Math.PI);
    roofTrimGeo.rotateZ(Math.PI / 2);
    roofTrimGeo.translate(0, 25, 0);
    const trimA = new THREE.Mesh(roofTrimGeo, trimMat);
    trimA.castShadow = true;
    hangarAGroup.add(trimA);

    scene.add(hangarAGroup);

    this.obstacles.push({
      type: 'box',
      min: new THREE.Vector3(-150, 180, -135),
      max: new THREE.Vector3(-90, 210, -65),
      name: 'Hangar A'
    });

    // 3. Hangar B (X = -120, Z = 900, Base Y = 180)
    const hangarBGroup = hangarAGroup.clone();
    hangarBGroup.position.set(-120, 180, 900);
    scene.add(hangarBGroup);

    this.obstacles.push({
      type: 'box',
      min: new THREE.Vector3(-150, 180, 865),
      max: new THREE.Vector3(-90, 210, 935),
      name: 'Hangar B'
    });
  }

  spawnStuntRings() {
    const scene = this.engine.scene;

    const ringCoords = [
      { x: 0, y: 240, z: -1200 },
      { x: 300, y: 290, z: -2700 },
      { x: -350, y: 350, z: -4200 },
      { x: 0, y: 220, z: -5700 }
    ];

    ringCoords.forEach((coord, index) => {
      // Glow Torus (outer radius 24m, tube radius 2.2m)
      const ringGeo = new THREE.TorusGeometry(24, 2.2, 12, 36);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00d2ff,
        emissive: 0x0033aa,
        roughness: 0.3,
        metalness: 0.8,
        flatShading: true
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(coord.x, coord.y, coord.z);
      scene.add(ringMesh);

      this.rings.push({
        id: index,
        center: new THREE.Vector3(coord.x, coord.y, coord.z),
        mesh: ringMesh,
        innerRadius: 22.0,
        outerRadius: 26.5
      });
    });
  }

  checkCollision(aircraft) {
    if (aircraft.isCrashed) return false;

    const pos = aircraft.position;

    // 1. Check obstacles (Tower & Hangars)
    for (const obs of this.obstacles) {
      if (pos.x >= obs.min.x && pos.x <= obs.max.x &&
          pos.y >= obs.min.y && pos.y <= obs.max.y &&
          pos.z >= obs.min.z && pos.z <= obs.max.z) {
        console.log(`[ObstacleManager] Aircraft hit obstacle: ${obs.name}`);
        return true;
      }
    }

    // 2. Check Stunt Rings
    for (const ring of this.rings) {
      const dist = pos.distanceTo(ring.center);

      // Collision with ring structure (torus tube)
      if (dist >= ring.innerRadius && dist <= ring.outerRadius) {
        if (Math.abs(pos.z - ring.center.z) < 12.0) {
          console.log(`[ObstacleManager] Aircraft struck Ring ${ring.id + 1} structure!`);
          return true;
        }
      }

      // Fly through center check
      if (dist < ring.innerRadius) {
        // Check if aircraft crossed the ring plane (Z threshold check)
        if (Math.abs(pos.z - ring.center.z) < 15.0 && !this.clearedStatus[ring.id]) {
          this.clearedStatus[ring.id] = true;
          this.clearedRingsCount++;

          // Change ring color to glowing green to indicate success
          if (ring.mesh && ring.mesh.material) {
            ring.mesh.material.color.setHex(0x00ff66);
            ring.mesh.material.emissive.setHex(0x00aa33);
          }

          // Update HUD readout
          const display = document.getElementById('hud-rings-val');
          if (display) {
            display.textContent = `${this.clearedRingsCount} / ${this.totalRings}`;
          }

          // Show transient clearing alert
          this.showClearAlert();

          // Play achievement sound chime via SoundManager
          const sound = this.engine.moduleManager.get('Sound');
          if (sound && typeof sound.playChimeSound === 'function') {
            sound.playChimeSound();
          }

          console.log(`[ObstacleManager] Ring ${ring.id + 1} cleared! Total: ${this.clearedRingsCount}`);
        }
      }
    }

    return false;
  }

  showClearAlert() {
    const alertBox = document.getElementById('hud-ring-clear-alert');
    if (alertBox) {
      alertBox.classList.remove('hidden');
      alertBox.classList.remove('fade-out');
      
      // Auto-hide alert after 2.5 seconds
      if (this.alertTimeout) clearTimeout(this.alertTimeout);
      this.alertTimeout = setTimeout(() => {
        alertBox.classList.add('fade-out');
        setTimeout(() => {
          alertBox.classList.add('hidden');
        }, 500);
      }, 2000);
    }
  }

  update(deltaTime) {
  }
}
