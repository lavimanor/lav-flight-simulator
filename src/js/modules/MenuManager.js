import { HangarPreview } from './ui/HangarPreview.js';

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
    this.preview = new HangarPreview();
  }

  init(engine) {
    this.engine = engine;
    this.toggleBtn = document.getElementById('menu-toggle-btn');
    this.modal = document.getElementById('hud-menu-modal');
    this.spawnBtn = document.getElementById('menu-spawn-btn');
    this.closeBtn = document.getElementById('menu-close-btn');

    this.weatherBtns = Array.from(document.querySelectorAll('.weather-btn'));
    this.bindEvents();
    this.renderAircraftCards();

    if (this.preview) {
      this.preview.init();
      this.preview.setAircraft(this.selectedAircraftId);
    }
    this.updateSpecsPanel();
  }

  // Static buttons are bound exactly once from init(); re-binding them on every
  // card re-render stacked duplicate handlers (e.g. double aircraft spawns).
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

  bindCardEvents() {
    this.cards.forEach((card) => {
      card.addEventListener('click', () => {
        this.cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedAircraftId = card.getAttribute('data-id');
        if (this.preview) {
          this.preview.setAircraft(this.selectedAircraftId);
        }
        this.updateSpecsPanel();
      });
    });
  }

  openMenu() {
    if (!this.modal) return;
    this.isOpen = true;
    this.modal.classList.remove('hidden');
    if (this.preview) {
      this.preview.setAircraft(this.selectedAircraftId);
    }
    this.updateSpecsPanel();
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
      const prev = this.aircraftManager.activeAircraft;
      const currentPos = prev.position.clone();
      
      this.aircraftManager.spawnAircraft(this.selectedAircraftId, currentPos);
      
      const newAircraft = this.aircraftManager.activeAircraft;
      if (prev && !prev.isCrashed) {
        const currentVel = prev.velocity.clone();
        const currentQuat = prev.group.quaternion.clone();
        const currentThrottle = prev.controls.throttle;
        
        newAircraft.velocity.copy(currentVel);
        newAircraft.group.quaternion.copy(currentQuat);
        newAircraft.rotation.copy(newAircraft.group.rotation);
        newAircraft.quaternion.copy(newAircraft.group.quaternion);
        newAircraft.controls.throttle = currentThrottle;
      }
    }
    this.closeMenu();
  }

  updateSpecsPanel() {
    const specEngine = document.getElementById('spec-engine');
    const specThrust = document.getElementById('spec-thrust');
    const specRoll = document.getElementById('spec-roll');
    if (!specEngine || !specThrust || !specRoll) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    const config = this.aircraftManager ? this.aircraftManager.configs[this.selectedAircraftId] : null;
    if (!config) return;

    // Dynamically retrieve parameters directly from the parsed plane profile
    specEngine.textContent = config.engineType ?? "Single Propeller";
    
    // Convert base Newtons into a user-friendly kilonewtons (kN) format
    const thrustKn = (config.maxThrust / 1000).toFixed(1);
    specThrust.textContent = `${thrustKn} kN`;
    
    specRoll.textContent = `${config.rollRate.toFixed(2)} rad/s`;
  }

  renderAircraftCards() {
    const container = document.querySelector('.aircraft-cards-container');
    if (!container) return;
    container.innerHTML = ''; 

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    const configs = this.aircraftManager ? this.aircraftManager.configs : {};
    
    Object.keys(configs).forEach((id, index) => {
      const config = configs[id];
      const card = document.createElement('div');
      card.className = `aircraft-card${index === 0 ? ' selected' : ''}`;
      card.setAttribute('data-id', id);
      
      const desc = config.description || `Configured ${config.name} model.`;
      card.innerHTML = `
        <div class="card-title">${config.name}</div>
        <p class="description">${desc}</p>
      `;
      container.appendChild(card);
    });

    const firstId = Object.keys(configs)[0];
    if (firstId) {
      this.selectedAircraftId = firstId;
    }
    this.cards = Array.from(document.querySelectorAll('.aircraft-card'));
    this.bindCardEvents();
  }

  update(deltaTime) {}
}