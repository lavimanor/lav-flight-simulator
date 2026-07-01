export class MainMenuManager {
  constructor() {
    this.engine = null;
    this.isOpen = true; // Opens active on simulator startup

    // Cached DOM elements
    this.menuOverlay = null;
    this.btnFly = null;
    this.btnHangar = null;
  }

  init(engine) {
    this.engine = engine;

    // Cache structural DOM components
    this.menuOverlay = document.getElementById('main-menu-overlay');
    this.btnFly = document.getElementById('menu-btn-fly');
    this.btnHangar = document.getElementById('menu-btn-hangar');

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

  update(deltaTime) {
    // Custom loop routines can be handled here if needed
  }
}