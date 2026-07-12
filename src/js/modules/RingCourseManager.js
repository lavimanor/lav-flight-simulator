import * as THREE from 'three';
import { FlightPhysicsSolver } from '../physics/FlightPhysicsSolver.js';

/**
 * A checkpoint ring course laid out along the runway heading (+Z). Rings are
 * fly-through targets, not obstacles: passing through the hoop scores it, and
 * the HUD RINGS counter tracks progress. Respawning resets the course.
 *
 * Registered as 'Obstacles' so the physics solver's collision hook finds it;
 * rings never cause a crash, so checkCollision always reports false.
 */
export class RingCourseManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.rings = [];
    this.passedCount = 0;
    this.lastSpawnCount = -1;
    this.prevPosition = null;
    this.hudEl = null;
  }

  init(engine) {
    this.engine = engine;
    this.hudEl = document.getElementById('hud-rings-val');
    this.buildCourse();
  }

  buildCourse() {
    // Down-runway slalom that climbs with the terrain. y is anchored to the
    // real terrain height so no ring ever spawns underground.
    const layout = [
      { x: 0,    z: 300,  agl: 60 },
      { x: 70,   z: 1000, agl: 100 },
      { x: -90,  z: 1700, agl: 140 },
      { x: 0,    z: 2400, agl: 180 },
      { x: 110,  z: 3100, agl: 210 },
      { x: 0,    z: 3800, agl: 240 }
    ];
    const radius = 30;
    const geometry = new THREE.TorusGeometry(radius, 1.6, 10, 40);

    for (const spot of layout) {
      const terrain = FlightPhysicsSolver.getTerrainHeightAt(spot.x, spot.z);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ccff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(spot.x, terrain + spot.agl, spot.z);
      // Torus is built in the XY plane, which already faces the +Z flight path.
      this.engine.scene.add(mesh);
      this.rings.push({ mesh, radius, passed: false });
    }
    this.updateHud();
  }

  // Physics collision hook: rings are checkpoints, never a crash.
  checkCollision(aircraft) {
    return false;
  }

  resetCourse() {
    this.passedCount = 0;
    this.prevPosition = null;
    for (const ring of this.rings) {
      ring.passed = false;
      ring.mesh.material.color.setHex(0x00ccff);
    }
    this.updateHud();
  }

  updateHud() {
    if (!this.hudEl) return;
    this.hudEl.textContent = `${this.passedCount} / ${this.rings.length}`;
    this.hudEl.style.color = this.passedCount === this.rings.length ? '#ffd700' : '#00ff66';
  }

  // Audio + toast feedback the moment a ring is threaded. The final ring gets
  // a brighter chime and the big COURSE COMPLETE banner (styled in main.css).
  celebrateRing() {
    const done = this.passedCount === this.rings.length;
    const soundManager = this.engine.moduleManager.get('Sound');
    if (soundManager) soundManager.playChimeSound(done ? 1.35 : 1.0);

    let alertEl = document.getElementById('hud-ring-clear-alert');
    if (!alertEl) {
      alertEl = document.createElement('div');
      alertEl.id = 'hud-ring-clear-alert';
      document.body.appendChild(alertEl);
    }
    alertEl.textContent = done
      ? '★ COURSE COMPLETE ★'
      : `RING ${this.passedCount} / ${this.rings.length}`;
    alertEl.classList.remove('fade-out');
    // Restart the pulse animation on back-to-back rings.
    alertEl.style.animation = 'none';
    void alertEl.offsetWidth;
    alertEl.style.animation = '';
    clearTimeout(this.alertTimer);
    this.alertTimer = setTimeout(() => alertEl.classList.add('fade-out'), done ? 3200 : 1400);
  }

  update(deltaTime) {
    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    const aircraft = this.aircraftManager ? this.aircraftManager.activeAircraft : null;
    if (!aircraft) return;

    if (aircraft.spawnCount !== this.lastSpawnCount) {
      this.lastSpawnCount = aircraft.spawnCount;
      this.resetCourse();
    }

    // Unscored rings pulse so they read as targets from a distance.
    const pulse = 0.65 + 0.3 * Math.sin(performance.now() * 0.004);
    for (const ring of this.rings) {
      ring.mesh.material.opacity = ring.passed ? 0.9 : pulse;
    }

    const pos = aircraft.position;
    if (this.prevPosition && !aircraft.isCrashed) {
      for (const ring of this.rings) {
        if (ring.passed) continue;
        const c = ring.mesh.position;
        // Scored when the flight path crosses the ring's plane inside the hoop.
        const before = this.prevPosition.z - c.z;
        const after = pos.z - c.z;
        if (before !== 0 && Math.sign(before) !== Math.sign(after || 1)) {
          const lateral = Math.hypot(pos.x - c.x, pos.y - c.y);
          if (lateral < ring.radius) {
            ring.passed = true;
            ring.mesh.material.color.setHex(0x00ff66);
            this.passedCount += 1;
            this.updateHud();
            this.celebrateRing();
            console.log(`[RingCourseManager] Ring scored (${this.passedCount}/${this.rings.length})`);
          }
        }
      }
    }
    this.prevPosition = this.prevPosition ? this.prevPosition.copy(pos) : pos.clone();
  }
}
