import * as THREE from 'three';

export class MainMenuManager {
  constructor() {
    this.engine = null;
    this.isOpen = true; // Opens active on simulator startup

    // Cached DOM elements
    this.menuOverlay = null;
    this.btnFly = null;
    this.btnHangar = null;
    this.btnSettings = null;
    this.btnMainMenuToggle = null;
  }

  init(engine) {
    this.engine = engine;

    // Cache structural DOM components
    this.menuOverlay = document.getElementById('main-menu-overlay');
    this.btnFly = document.getElementById('menu-btn-fly');
    this.btnHangar = document.getElementById('menu-btn-hangar');
    this.btnSettings = document.getElementById('menu-btn-settings');
    this.btnMainMenuToggle = document.getElementById('hud-btn-mainmenu');

    this.bindEvents();
    this.setupStartupState();
  }

  bindEvents() {
    if (this.btnFly) {
      this.btnFly.addEventListener('click', () => this.startFlight());
    }

    if (this.btnHangar) {
      this.btnHangar.addEventListener('click', () => {
        // Toggle the existing in-flight Hangar/Weather Selector
        const menuManager = this.engine.moduleManager.get('Menu');
        if (menuManager) {
          menuManager.openMenu();
        }
      });
    }

    if (this.btnSettings) {
      this.btnSettings.addEventListener('click', () => {
        // Trigger the Pilot Configuration Modal
        const settingsMenu = this.engine.moduleManager.get('Settings');
        if (settingsMenu) {
          settingsMenu.openSettings();
        }
      });
    }

    if (this.btnMainMenuToggle) {
      this.btnMainMenuToggle.addEventListener('click', () => this.showMenu());
    }
  }

  setupStartupState() {
    // 1. Swap Camera mode to Menu Orbit View on start
    const cameraManager = this.engine.moduleManager.get('Camera');
    if (cameraManager) {
      cameraManager.currentMode = 'menuOrbit';
    }

    // 2. Hide active flight instruments HUD until the flight is launched
    const hudOverlay = document.getElementById('hud-overlay');
    if (hudOverlay) {
      hudOverlay.style.visibility = 'hidden';
    }

    // 3. Ensure pre-flight panel is visible
    if (this.menuOverlay) {
      this.menuOverlay.classList.remove('hidden');
    }
  }

  startFlight() {
    this.isOpen = false;

    // Fade out pre-flight menu screen
    if (this.menuOverlay) {
      this.menuOverlay.classList.add('hidden');
    }

    // Swap Camera mode to Third-Person Chase follow
    const cameraManager = this.engine.moduleManager.get('Camera');
    if (cameraManager) {
      cameraManager.currentMode = 'thirdPerson';
      cameraManager.isFirstFrame = true; // Snap follow camera instantly behind aircraft
    }

    // Reveal the in-flight flight systems HUD
    const hudOverlay = document.getElementById('hud-overlay');
    if (hudOverlay) {
      hudOverlay.style.visibility = 'visible';
    }

    console.log(`[MainMenuManager] Pre-flight mode completed. Simulator launched into active chase view.`);
  }

  showMenu() {
    this.isOpen = true;

    // 1. Reveal pre-flight startup menu screen
    if (this.menuOverlay) {
      this.menuOverlay.classList.remove('hidden');
    }

    // 2. Hide in-flight flight systems HUD
    const hudOverlay = document.getElementById('hud-overlay');
    if (hudOverlay) {
      hudOverlay.style.visibility = 'hidden';
    }

    // 3. Swap Camera mode back to Orbit View around aircraft
    const cameraManager = this.engine.moduleManager.get('Camera');
    if (cameraManager) {
      cameraManager.currentMode = 'menuOrbit';
      cameraManager.isFirstFrame = true;
    }

    // 4. Safely respawn / park aircraft back on the flat runway plateau coordinates
    const aircraftManager = this.engine.moduleManager.get('Aircraft');
    if (aircraftManager && aircraftManager.activeAircraft) {
      const aircraft = aircraftManager.activeAircraft;
      const restY = 180.0 + (aircraft.config.groundClearanceOffset ?? 1.2);
      aircraft.spawn(this.engine.scene, new THREE.Vector3(0, restY, -500));
    }

    console.log(`[MainMenuManager] Returned to pre-flight menu. Reset aircraft on runway.`);
  }

  update(deltaTime) {
    // Custom loop routines can be handled here if needed
  }
}