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
    this.configs = AircraftConfig; // Bind register reference
    
    // Load local aircraft JSON configuration profiles asynchronously [3]
    this.loadAllAircraftConfigs().then(() => {
      this.spawnAircraft('trainer', new THREE.Vector3(0, 181.2, -500));
      
      // Update UI panels once coordinates and parameters are loaded
      const menuManager = this.engine.moduleManager.get('Menu');
      if (menuManager) {
        menuManager.updateSpecsPanel();
        // Trigger the 3D preview to load now that configurations are ready [3, 4]
        if (menuManager.preview) {
          menuManager.preview.setAircraft(menuManager.selectedAircraftId);
        }
      }
    });
  }

  async loadAllAircraftConfigs() {
    const ids = ['trainer', 'fighter', 'stunt', 'cargo', 'f35', 'f16', 'b2'];
    for (const id of ids) {
      try {
        const response = await fetch(`data/aircraft/${id}.json`);
        if (!response.ok) throw new Error(`Fetch failed`);
        const config = await response.json();
        this.configs[id] = config;
      } catch (error) {
        console.error(`[AircraftManager] Failed to load JSON config for '${id}', falling back to default parameters:`, error);
        // Resilient safe fallback parameters to prevent app lockouts [3]
        this.configs[id] = {
          id,
          name: `${id.toUpperCase()} (Fallback)`,
          mass: 1000,
          wingArea: 15.0,
          aspectRatio: 7.0,
          maxThrust: 6000,
          rollRate: 1.5,
          pitchRate: 1.0,
          yawRate: 0.5,
          dragCoefficientZero: 0.03,
          liftCoefficientMax: 1.4,
          emptyWeight: 800,
          maxFuelCapacity: 100,
          dimensions: { span: 10, length: 8, height: 2 },
          camera: { offsetX: 0, offsetY: 4, offsetZ: -15, lookAheadDistance: 6 },
          modelType: 'built-in'
        };
      }
    }
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