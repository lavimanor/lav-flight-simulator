export class MenuManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.weatherManager = null;
    this.isOpen = false;
    this.selectedAircraftId = 'trainer';
    this.selectedWeatherId = 'clear';
    this.toggleBtn = null;
    this.modal = null;
    this.spawnBtn = null;
    this.closeBtn = null;
    this.cards = [];
    this.weatherBtns = [];
  }

  init(engine) {
    this.engine = engine;
    this.toggleBtn = document.getElementById('menu-toggle-btn');
    this.modal = document.getElementById('hud-menu-modal');
    this.spawnBtn = document.getElementById('menu-spawn-btn');
    this.closeBtn = document.getElementById('menu-close-btn');
    this.weatherBtns = Array.from(document.querySelectorAll('.weather-btn'));

    // Rebuild cards from registry dynamically
    this.rebuildAircraftCards();
    this.bindEvents();
  }

  rebuildAircraftCards() {
    const container = document.querySelector('.aircraft-cards-container');
    if (!container || !this.engine) return;

    // Clear previous hardcoded structural components
    container.innerHTML = '';

    const aircraftManager = this.engine.moduleManager.get('Aircraft');
    if (!aircraftManager) return;

    const configs = aircraftManager.configs;

    Object.keys(configs).forEach((key) => {
      const conf = configs[key];
      const isSelected = (key === this.selectedAircraftId);

      const card = document.createElement('div');
      card.className = `aircraft-card${isSelected ? ' selected' : ''}`;
      card.setAttribute('data-id', key);

      card.innerHTML = `
        <div class="card-title">${conf.name}</div>
        <p class="description">${conf.description || 'Custom loaded modular aircraft dynamics profile.'}</p>
        <div class="specs">
          <div><span>Weight:</span> ${conf.mass.toLocaleString()} kg</div>
          <div><span>Max Thrust:</span> ${(conf.maxThrust / 1000).toFixed(1)} kN</div>
          <div><span>Roll Rate:</span> ${conf.rollRate.toFixed(1)} rad/s</div>
        </div>
      `;

      card.addEventListener('click', () => {
        const allCards = container.querySelectorAll('.aircraft-card');
        allCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedAircraftId = key;
      });

      container.appendChild(card);
    });

    this.cards = Array.from(container.querySelectorAll('.aircraft-card'));
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
    if (this.weatherManager) {
      this.weatherManager.setWeather(this.selectedWeatherId);
    }
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

  update(deltaTime) {}
}