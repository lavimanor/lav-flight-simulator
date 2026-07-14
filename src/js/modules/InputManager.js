import * as THREE from 'three';

export class InputManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.menuManager = null;
    this.keys = {};
    
    this.navCooldown = 0.0;
    this.focusIndex = 0;
    this.lastTargetSelector = null;

    // Button edge-detection latches
    this.lastBtn0 = false;
    this.lastBtn1 = false;

    this.onKeyDown = (e) => this.handleKeyDown(e);
    this.onKeyUp = (e) => this.handleKeyUp(e);
  }

  init(engine) {
    this.engine = engine;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  handleKeyDown(e) {
    const hardwareManager = this.engine.moduleManager.get('Hardware');
    if (hardwareManager) {
      hardwareManager.lastInputDevice = 'keyboard';
    }

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
          if (aircraft.config.fixedGear) {
            console.log('[InputManager] Gear is fixed on this aircraft.');
          } else {
            aircraft.gearRetracted = !aircraft.gearRetracted;
            console.log(`[InputManager] Gear Retracted: ${aircraft.gearRetracted}`);
          }
        }
        if (e.code === 'KeyF' && !aircraft.isCrashed) {
          if (aircraft.config.hasFlaps === false) {
            console.log('[InputManager] This aircraft has no flaps.');
          } else {
            aircraft.flapsStage = (aircraft.flapsStage + 1) % 3;
            console.log(`[InputManager] Flaps cycled to Stage: ${aircraft.flapsStage}`);
          }
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
        if (e.code === 'KeyV' && !aircraft.isCrashed) {
          const cfg = aircraft.config;
          const isJet = cfg.isJet ?? ['fighter', 'f16', 'f22', 'f35', 'b2'].includes(cfg.id);
          const isTurboprop = !isJet && (cfg.engineType || '').toLowerCase().includes('turboprop');
          const hasReverser = cfg.hasReverser ?? (isJet || isTurboprop);
          if (hasReverser) {
            aircraft.reverseActive = !aircraft.reverseActive;
            console.log(`[InputManager] Thrust reversers: ${aircraft.reverseActive}`);
          } else {
            console.log('[InputManager] This aircraft has no thrust reversers.');
          }
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

    if (e.code === 'KeyH') {
      const panel = document.getElementById('hud-help-panel');
      if (panel) panel.classList.toggle('hidden');
    }

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

  // Identifies which overlay is open to parse focused options
  getActiveSelector(settings, hangar, mainMenu) {
    if (settings && settings.isOpen) {
      return '#hud-settings-content input, #hud-settings-content button, #hud-settings-content select';
    }
    if (hangar && hangar.isOpen) {
      return '.aircraft-card, .weather-btn, #game-menu-settings-btn, #menu-spawn-btn, #menu-close-btn';
    }
    if (mainMenu && mainMenu.isOpen) {
      return '.menu-main-actions button';
    }
    return null;
  }

  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;
    if (!this.aircraftManager) this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    if (!this.menuManager) this.menuManager = this.engine.moduleManager.get('Menu');

    const aircraft = this.aircraftManager.activeAircraft;
    const mainMenu = this.engine.moduleManager.get('MainMenu');
    const settings = this.engine.moduleManager.get('Settings');

    const mainMenuOpen = mainMenu ? mainMenu.isOpen : false;
    const isMenuOpen = mainMenuOpen || (this.menuManager && this.menuManager.isOpen) || (settings && settings.isOpen);

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) { gp = gamepads[i]; break; }
    }

    if (gp && isMenuOpen) {
      if (this.navCooldown > 0) {
        this.navCooldown -= deltaTime;
      }

      // Action button edge triggering (single-pulse clicks)
      const btn0 = gp.buttons[0]?.pressed || false; // Button A (Confirm)
      const btn1 = gp.buttons[1]?.pressed || false; // Button B (Back / Cancel)
      const justPressed0 = btn0 && !this.lastBtn0;
      const justPressed1 = btn1 && !this.lastBtn1;
      this.lastBtn0 = btn0;
      this.lastBtn1 = btn1;

      const selector = this.getActiveSelector(settings, this.menuManager, mainMenu);
      if (selector) {
        if (selector !== this.lastTargetSelector) {
          this.lastTargetSelector = selector;
          this.focusIndex = 0;
        }

        const elements = Array.from(document.querySelectorAll(selector)).filter((el) => {
          return el.offsetParent !== null && !el.disabled;
        });

        if (elements.length > 0) {
          const activeEl = document.activeElement;

          // Standard directional reads
          const dUp = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
          const dDown = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
          const dLeft = gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
          const dRight = gp.buttons[15]?.pressed || gp.axes[0] > 0.5;

          // Case 1: Adjust focused slide controls (Sliders)
          if (activeEl && activeEl.tagName === 'INPUT' && activeEl.type === 'range') {
            const step = parseFloat(activeEl.step) || 0.05;
            const min = parseFloat(activeEl.min) || 0;
            const max = parseFloat(activeEl.max) || 1;
            let val = parseFloat(activeEl.value) || 0;

            if (this.navCooldown <= 0 && (dLeft || dRight)) {
              this.navCooldown = 0.08; // Fast scroll interval for sliders
              if (dLeft) {
                activeEl.value = Math.max(min, val - step);
              } else if (dRight) {
                activeEl.value = Math.min(max, val + step);
              }
              activeEl.dispatchEvent(new Event('input', { bubbles: true }));
              activeEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          // Case 2: Adjust focused dropdown menus (Select elements)
          else if (activeEl && activeEl.tagName === 'SELECT') {
            if (this.navCooldown <= 0 && (dLeft || dRight)) {
              this.navCooldown = 0.20;
              if (dLeft) {
                activeEl.selectedIndex = Math.max(0, activeEl.selectedIndex - 1);
              } else if (dRight) {
                activeEl.selectedIndex = Math.min(activeEl.options.length - 1, activeEl.selectedIndex + 1);
              }
              activeEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          // Standard Focus Cycling
          if (this.navCooldown <= 0 && (dUp || dDown || dLeft || dRight)) {
            // Avoid modifying focus on horizontal actions if inside a slider/select
            const isRange = activeEl && activeEl.tagName === 'INPUT' && activeEl.type === 'range';
            const isSelect = activeEl && activeEl.tagName === 'SELECT';
            
            if (!(isRange || isSelect)) {
              this.navCooldown = 0.20;
              if (dDown || dRight) {
                this.focusIndex = (this.focusIndex + 1) % elements.length;
              } else if (dUp || dLeft) {
                this.focusIndex = (this.focusIndex - 1 + elements.length) % elements.length;
              }
              elements[this.focusIndex].focus();
            }
          }

          // Edge-triggered click dispatch
          if (justPressed0) {
            elements[this.focusIndex].focus();
            elements[this.focusIndex].click();
          }

          // Edge-triggered cancel/back action
          if (justPressed1) {
            if (settings && settings.isOpen) {
              settings.closeSettings();
            } else if (this.menuManager && this.menuManager.isOpen) {
              this.menuManager.closeMenu();
            }
          }
        }
      }
      return;
    }

    if (!aircraft) return;

    aircraft.controls.pitch = 0;
    aircraft.controls.roll = 0;
    aircraft.controls.yaw = 0;

    const hardwareManager = this.engine.moduleManager.get('Hardware');
    const hwState = hardwareManager ? hardwareManager.unifiedState : null;

    if (aircraft.isCrashed) {
      if (hwState && hwState.respawn) {
        this.respawnAircraft(aircraft);
      }
      return;
    }

    // 1. Process Keyboard Continuous States
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

    // 2. Process Hardware Controller States
    let hwPitch = 0.0;
    let hwRoll = 0.0;
    let hwYaw = 0.0;
    let hwThrottleDelta = 0.0;

    if (hwState) {
      hwPitch = hwState.pitch;
      hwRoll = hwState.roll;
      hwYaw = hwState.yaw;
      hwThrottleDelta = hwState.throttleDelta;

      if (hwState.gearToggle && !aircraft.config.fixedGear) {
        aircraft.gearRetracted = !aircraft.gearRetracted;
      }
      if (hwState.flapsDown && aircraft.config.hasFlaps !== false) {
        aircraft.flapsStage = Math.min(aircraft.flapsStage + 1, 2);
      }
      if (hwState.flapsUp && aircraft.config.hasFlaps !== false) {
        aircraft.flapsStage = Math.max(aircraft.flapsStage - 1, 0);
      }
      if (hwState.airbrakeToggle) {
        aircraft.airbrakesActive = !aircraft.airbrakesActive;
      }
      if (hwState.wheelBrakesToggle) {
        aircraft.controls.brakes = !aircraft.controls.brakes;
      }
      if (hwState.pauseToggle && this.menuManager) {
        this.menuManager.openMenu();
      }
    }

    aircraft.controls.pitch = Math.abs(hwPitch) > 0.01 ? hwPitch : kbPitch;
    aircraft.controls.roll = Math.abs(hwRoll) > 0.01 ? hwRoll : kbRoll;
    aircraft.controls.yaw = Math.abs(hwYaw) > 0.01 ? hwYaw : kbYaw;

    let targetThrottleDelta = kbThrottleDelta;
    if (Math.abs(hwThrottleDelta) > 0.01) {
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
      aircraft.afterburnerActive = hasAfterburner && aircraft.controls.throttle > 1.01;
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