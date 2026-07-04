import * as THREE from 'three';

export class InputManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.menuManager = null;
    this.keys = {};
    this.onKeyDown = (e) => this.handleKeyDown(e);
    this.onKeyUp = (e) => this.handleKeyUp(e);
  }

  init(engine) {
    this.engine = engine;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  handleKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift', 'Control'].includes(e.key)) {
      e.preventDefault();
    }
    this.keys[e.code] = true;

    const mainMenu = this.engine ? this.engine.moduleManager.get('MainMenu') : null;
    const mainMenuOpen = mainMenu ? mainMenu.isOpen : false;

    if (!mainMenuOpen && (!this.menuManager || !this.menuManager.isOpen)) {
      const aircraft = this.aircraftManager ? this.aircraftManager.activeAircraft : null;
      if (aircraft) {
        if (e.code === 'KeyG' && !aircraft.isCrashed) {
          aircraft.gearRetracted = !aircraft.gearRetracted;
          console.log(`[InputManager] Gear Retracted: ${aircraft.gearRetracted}`);
        }
        if (e.code === 'KeyF' && !aircraft.isCrashed) {
          aircraft.flapsStage = (aircraft.flapsStage + 1) % 3;
          console.log(`[InputManager] Flaps cycled to Stage: ${aircraft.flapsStage}`);
        }
        if (e.code === 'KeyI' && !aircraft.isCrashed) {
          if (aircraft.fuel > 0) {
            aircraft.engineOn = !aircraft.engineOn;
            console.log(`[InputManager] Engine Ignition toggled: ${aircraft.engineOn}`);
          }
        }
        if (e.code === 'KeyC' && !aircraft.isCrashed) {
          aircraft.airbrakesActive = !aircraft.airbrakesActive;
          console.log(`[InputManager] Airbrakes: ${aircraft.airbrakesActive}`);
        }
        if (e.code === 'KeyB' && !aircraft.isCrashed) {
          aircraft.controls.brakes = !aircraft.controls.brakes;
          console.log(`[InputManager] Wheel Brakes toggled: ${aircraft.controls.brakes}`);
        }
        if (e.code === 'KeyR' && aircraft.isCrashed) {
          const restY = 180.0 + (aircraft.config.groundClearanceOffset ?? 1.2);
          aircraft.spawn(this.engine.scene, new THREE.Vector3(0, restY, -500));
          const cameraManager = this.engine.moduleManager.get('Camera');
          if (cameraManager) {
            cameraManager.isFirstFrame = true;
          }
          console.log(`[InputManager] Aircraft respawned and camera snapped.`);
        }
      }
    }
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;
    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    if (!this.menuManager) {
      this.menuManager = this.engine.moduleManager.get('Menu');
    }
    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

    const aircraft = this.aircraftManager.activeAircraft;
    aircraft.controls.pitch = 0;
    aircraft.controls.roll = 0;
    aircraft.controls.yaw = 0;

    const mainMenu = this.engine.moduleManager.get('MainMenu');
    const mainMenuOpen = mainMenu ? mainMenu.isOpen : false;

    if (mainMenuOpen || (this.menuManager && this.menuManager.isOpen) || aircraft.isCrashed) {
      return;
    }

    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      aircraft.controls.pitch = -1.0;
    }
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      aircraft.controls.pitch = 1.0;
    }
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      aircraft.controls.roll = -1.0;
    }
    if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      aircraft.controls.roll = 1.0;
    }
    if (this.keys['KeyQ']) {
      aircraft.controls.yaw = -1.0;
    }
    if (this.keys['KeyE']) {
      aircraft.controls.yaw = 1.0;
    }

    const isJet = aircraft.config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(aircraft.config.id);

    if (aircraft.engineOn && aircraft.engineSpool > 0.8) {
      const throttleRate = 1.5 * deltaTime;
      if (this.keys['ShiftLeft'] || this.keys['Space']) {
        const maxThrottle = isJet ? 1.2 : 1.0;
        aircraft.controls.throttle = Math.min(aircraft.controls.throttle + throttleRate, maxThrottle);
      }
      if (this.keys['ControlLeft'] || this.keys['KeyX']) {
        aircraft.controls.throttle = Math.max(aircraft.controls.throttle - throttleRate, 0.0);
      }
      if (isJet && aircraft.controls.throttle > 1.01) {
        aircraft.afterburnerActive = true;
      } else {
        aircraft.afterburnerActive = false;
      }
    } else {
      aircraft.controls.throttle = Math.max(aircraft.controls.throttle - 2.0 * deltaTime, 0.0);
      aircraft.afterburnerActive = false;
    }
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}