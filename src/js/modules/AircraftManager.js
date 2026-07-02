import { AircraftConfig } from '../aircraft/AircraftConfig.js';
import { AircraftBase } from '../aircraft/AircraftBase.js';
import * as THREE from 'three';

export class AircraftManager {
  constructor() {
    this.engine = null;
    this.activeAircraft = null;
    this.configs = AircraftConfig;
  }

  init(engine) {
    this.engine = engine;

    // Spawn aircraft resting on Runway asphalt at Y: 181.2m (180m plateau + 1.2m landing gear offset)
    this.spawnAircraft('trainer', new THREE.Vector3(0, 181.2, -500));
  }

  spawnAircraft(configId, position) {
    const config = this.configs[configId];
    if (!config) {
      throw new Error(`Aircraft spawning failed: config ID '${configId}' is not defined.`);
    }

    // Clear any existing active aircraft mesh from the Three.js scene
    if (this.activeAircraft) {
      this.engine.scene.remove(this.activeAircraft.group);
    }

    // Instantiation
    this.activeAircraft = new AircraftBase(config);
    this.activeAircraft.engine = this.engine; // Secure resolving bridge link
    
    // Safety check: ensure Y position rests correctly on 180m runway if spawning near airfield
    let spawnPos = position.clone();
    if (spawnPos.z > -1000 && spawnPos.z < 2000 && Math.abs(spawnPos.x) < 100 && spawnPos.y < 185) {
      spawnPos.y = 181.2;
    }

    this.activeAircraft.spawn(this.engine.scene, spawnPos);

    // Apply a default 0% throttle for ground takeoff roll sequence
    this.activeAircraft.controls.throttle = 0.0;

    console.log(`[AircraftManager] Spawned: ${config.name} resting on runway coordinates X:${spawnPos.x} Y:${spawnPos.y} Z:${spawnPos.z}`);
  }

  update(deltaTime) {
    if (this.activeAircraft) {
      this.activeAircraft.update(deltaTime);
    }
  }
}