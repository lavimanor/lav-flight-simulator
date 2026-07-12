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
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift', 'Control', 'Home', 'End'].includes(e.key)) {
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
        if (e.code === 'KeyT' && !aircraft.isCrashed) {
          aircraft.controls.pitchTrim = 0.0;
          console.log('[InputManager] Pitch trim recentred.');
        }
        if (e.code === 'KeyR' && aircraft.isCrashed) {
          this.respawnAircraft(aircraft);
        }
      }
    }

    // Controls reference card (works even in menus / after a crash).
    if (e.code === 'KeyH') {
      const panel = document.getElementById('hud-help-panel');
      if (panel) panel.classList.toggle('hidden');
    }

    // Escape backs out of whatever modal is on top: settings, hangar, help card.
    if (e.code === 'Escape') {
      const settings = this.engine ? this.engine.moduleManager.get('Settings') : null;
      const menu = this.engine ? this.engine.moduleManager.get('Menu') : null;
      const help = document.getElementById('hud-help-panel');
      if (settings && settings.isOpen) {
        settings.closeSettings();
      } else if (menu && menu.isOpen) {
        menu.closeMenu();
      } else if (help && !help.classList.contains('hidden')) {
        help.classList.add('hidden');
      }
    }
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  respawnAircraft(aircraft) {
    const restY = 180.0 + (aircraft.config.groundClearanceOffset ?? 1.2);
    aircraft.spawn(this.engine.scene, new THREE.Vector3(0, restY, -500));
    const cameraManager = this.engine.moduleManager.get('Camera');
    if (cameraManager) {
      cameraManager.isFirstFrame = true;
    }
    console.log(`[InputManager] Aircraft respawned on runway.`);
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
    
    const mainMenu = this.engine.moduleManager.get('MainMenu');
    const mainMenuOpen = mainMenu ? mainMenu.isOpen : false;

    // Reset continuous controls for evaluation
    aircraft.controls.pitch = 0;
    aircraft.controls.roll = 0;
    aircraft.controls.yaw = 0;

    // Check for hardware module state data
    const hardwareManager = this.engine.moduleManager.get('Hardware');
    const hwState = hardwareManager ? hardwareManager.unifiedState : null;

    if (mainMenuOpen || (this.menuManager && this.menuManager.isOpen)) {
      // Toggle menu close from controller menu button if visible
      if (hwState && hwState.pauseToggle && this.menuManager && this.menuManager.isOpen) {
        this.menuManager.closeMenu();
      }
      return;
    }

    if (aircraft.isCrashed) {
      // Allow respawn via controller button (A Button)
      if (hwState && hwState.respawn) {
        this.respawnAircraft(aircraft);
      }
      return;
    }

    // 1. Process Keyboard Continuous Axes States
    let kbPitch = 0.0;
    let kbRoll = 0.0;
    let kbYaw = 0.0;
    let kbThrottleDelta = 0.0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) kbPitch = -1.0;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) kbPitch = 1.0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kbRoll = -1.0;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kbRoll = 1.0;
    if (this.keys['KeyQ']) kbYaw = -1.0;
    if (this.keys['KeyE']) kbYaw = 1.0;

    // Pitch trim: held keys walk the trim setting (End = nose up, Home = nose
    // down, matching +pitch = nose up); T recentres it instantly.
    const trimRate = 0.30 * deltaTime;
    if (this.keys['End']) {
      aircraft.controls.pitchTrim = Math.min((aircraft.controls.pitchTrim || 0) + trimRate, 0.5);
    }
    if (this.keys['Home']) {
      aircraft.controls.pitchTrim = Math.max((aircraft.controls.pitchTrim || 0) - trimRate, -0.5);
    }

    if (aircraft.engineOn && aircraft.engineSpool > 0.8) {
      if (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['Space']) kbThrottleDelta = 1.0;
      if (this.keys['ControlLeft'] || this.keys['ControlRight'] || this.keys['KeyX']) kbThrottleDelta = -1.0;
    }

    // 2. Process Hardware Analog Axes and Single-Pulse States
    let hwPitch = 0.0;
    let hwRoll = 0.0;
    let hwYaw = 0.0;
    let hwThrottleDelta = 0.0;

    if (hwState) {
      hwPitch = hwState.pitch;
      hwRoll = hwState.roll;
      hwYaw = hwState.yaw;
      hwThrottleDelta = hwState.throttleDelta;

      // Map discrete input toggles
      if (hwState.gearToggle) {
        aircraft.gearRetracted = !aircraft.gearRetracted;
        console.log(`[InputManager] Gear Retracted toggled via hardware: ${aircraft.gearRetracted}`);
      }
      if (hwState.flapsDown) {
        aircraft.flapsStage = Math.min(aircraft.flapsStage + 1, 2);
        console.log(`[InputManager] Flaps Extended: ${aircraft.flapsStage}`);
      }
      if (hwState.flapsUp) {
        aircraft.flapsStage = Math.max(aircraft.flapsStage - 1, 0);
        console.log(`[InputManager] Flaps Retracted: ${aircraft.flapsStage}`);
      }
      if (hwState.airbrakeToggle) {
        aircraft.airbrakesActive = !aircraft.airbrakesActive;
        console.log(`[InputManager] Airbrakes toggled: ${aircraft.airbrakesActive}`);
      }
      if (hwState.wheelBrakesToggle) {
        aircraft.controls.brakes = !aircraft.controls.brakes;
        console.log(`[InputManager] Wheel Brakes toggled: ${aircraft.controls.brakes}`);
      }
      if (hwState.pauseToggle && this.menuManager) {
        this.menuManager.openMenu();
        console.log(`[InputManager] Simulation paused via hardware input.`);
      }
    }

    // 3. Coordinate Inputs (prioritizing active hardware over keyboard)
    aircraft.controls.pitch = Math.abs(hwPitch) > 0.05 ? hwPitch : kbPitch;
    aircraft.controls.roll = Math.abs(hwRoll) > 0.05 ? hwRoll : kbRoll;
    aircraft.controls.yaw = Math.abs(hwYaw) > 0.05 ? hwYaw : kbYaw;

    let targetThrottleDelta = kbThrottleDelta;
    if (Math.abs(hwThrottleDelta) > 0.05) {
      targetThrottleDelta = hwThrottleDelta;
    }

    const isJet = aircraft.config.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(aircraft.config.id);
    const hasAfterburner = aircraft.config.hasAfterburner ?? isJet;

    if (aircraft.engineOn && aircraft.engineSpool > 0.8) {
      const throttleRate = 1.5 * deltaTime;
      const maxThrottle = hasAfterburner ? 1.2 : 1.0;
      aircraft.controls.throttle = Math.min(
        Math.max(aircraft.controls.throttle + targetThrottleDelta * throttleRate, 0.0),
        maxThrottle
      );

      if (hasAfterburner && aircraft.controls.throttle > 1.01) {
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