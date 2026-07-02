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

    this.renderAircraftCards();
    this.bindEvents();

    if (this.preview) {
      this.preview.init();
      this.preview.setAircraft(this.selectedAircraftId);
    }
    this.updateSpecsPanel();
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
    this.bindEvents();
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

    if (config.id === 'trainer') {
      specEngine.textContent = 'Single Piston';
      specThrust.textContent = '6.8 kN';
      specRoll.textContent = '1.5 rad/s';
    } else if (config.id === 'fighter') {
      specEngine.textContent = 'Twin Turbofan';
      specThrust.textContent = '115.0 kN';
      specRoll.textContent = '3.0 rad/s';
    } else if (config.id === 'stunt') {
      specEngine.textContent = 'Radial Piston';
      specThrust.textContent = '5.2 kN';
      specRoll.textContent = '4.5 rad/s';
    } else if (config.id === 'cargo') {
      specEngine.textContent = 'Quad Turboprop';
      specThrust.textContent = '180.0 kN';
      specRoll.textContent = '0.5 rad/s';
    } else if (config.id === 'f22') {
      specEngine.textContent = 'Twin Vectoring';
      specThrust.textContent = '156.0 kN';
      specRoll.textContent = '3.2 rad/s';
    } else if (config.id === 'b2') {
      specEngine.textContent = 'Quad Turbofan';
      specThrust.textContent = '312.0 kN';
      specRoll.textContent = '0.45 rad/s';
    } else if (config.id === 'f16') {
      specEngine.textContent = 'Single Turbofan';
      specThrust.textContent = '79.0 kN';
      specRoll.textContent = '3.2 rad/s';
    } else if (config.id === 'f35') {
      specEngine.textContent = 'Single Turbofan';
      specThrust.textContent = '191.0 kN';
      specRoll.textContent = '2.8 rad/s';
    }
  }

  update(deltaTime) {
  }
}