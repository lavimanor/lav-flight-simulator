export class MenuManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.weatherManager = null;
    this.isOpen = false;

    this.selectedAircraftId = 'trainer'; // Default card highlight
    this.selectedWeatherId = 'clear';    // Default weather selection

    // Cached DOM elements
    this.toggleBtn = null;
    this.modal = null;
    this.spawnBtn = null;
    this.closeBtn = null;
    this.cards = [];
    this.weatherBtns = [];
  }

  init(engine) {
    this.engine = engine;

    // Cache elements from index.html
    this.toggleBtn = document.getElementById('menu-toggle-btn');
    this.modal = document.getElementById('hud-menu-modal');
    this.spawnBtn = document.getElementById('menu-spawn-btn');
    this.closeBtn = document.getElementById('menu-close-btn');
    this.cards = Array.from(document.querySelectorAll('.aircraft-card'));
    this.weatherBtns = Array.from(document.querySelectorAll('.weather-btn'));

    this.bindEvents();
  }

  bindEvents() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.openMenu());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeMenu());
    }
    if (this.spawnBtn) {
      this.spawnBtn.addEventListener('click', () => this.handleSpawnAircraft());
    }

    // Bind card clicks
    this.cards.forEach((card) => {
      card.addEventListener('click', () => {
        this.cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedAircraftId = card.getAttribute('data-id');
      });
    });

    // Bind weather buttons clicks
    this.weatherBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.weatherBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedWeatherId = btn.getAttribute('data-weather');
      });
    });
  }

  openMenu() {
    if (!this.modal) return;
    this.isOpen = true;
    this.modal.classList.remove('hidden');
  }

  closeMenu() {
    if (!this.modal) return;
    this.isOpen = false;
    this.modal.classList.add('hidden');
  }

  handleSpawnAircraft() {
    if (!this.engine || !this.engine.moduleManager) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    if (!this.weatherManager) {
      this.weatherManager = this.engine.moduleManager.get('Weather');
    }

    // 1. Swap active weather settings
    if (this.weatherManager) {
      this.weatherManager.setWeather(this.selectedWeatherId);
    }

    // 2. Hot-swap active aircraft at current coordinates
    if (this.aircraftManager && this.aircraftManager.activeAircraft) {
      const currentPos = this.aircraftManager.activeAircraft.position.clone();
      const currentVel = this.aircraftManager.activeAircraft.velocity.clone();
      const currentQuat = this.aircraftManager.activeAircraft.group.quaternion.clone();
      const currentThrottle = this.aircraftManager.activeAircraft.controls.throttle;

      this.aircraftManager.spawnAircraft(this.selectedAircraftId, currentPos);

      const newAircraft = this.aircraftManager.activeAircraft;
      newAircraft.velocity.copy(currentVel);
      newAircraft.group.quaternion.copy(currentQuat);
      newAircraft.rotation.copy(newAircraft.group.rotation);
      newAircraft.quaternion.copy(newAircraft.group.quaternion);
      newAircraft.controls.throttle = currentThrottle;
    }

    this.closeMenu();
  }

  update(deltaTime) {
    // Dynamic overlay animations can be configured here
  }
}