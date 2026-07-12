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
      // The canvas has zero size while the modal is display:none, so the
      // renderer must be resized once the layout is actually visible.
      this.preview.resize();
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

  // Role badge shown on each card and next to the preview.
  static badgeFor(config) {
    if (!config.isJet) return { label: 'PROP', cls: 'prop' };
    if (config.hasAfterburner) return { label: 'AB JET', cls: 'ab' };
    return { label: 'JET', cls: 'jet' };
  }

  updateSpecsPanel() {
    const rows = document.getElementById('preview-specs-rows');
    const bars = document.getElementById('preview-stat-bars');
    const nameTag = document.getElementById('preview-aircraft-name');
    if (!rows || !bars) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    const config = this.aircraftManager ? this.aircraftManager.configs[this.selectedAircraftId] : null;
    if (!config) return;

    if (nameTag) nameTag.textContent = config.name;

    const topSpeedKts = Math.round((config.terminalSpeed ?? 60) * 1.944);
    // Level-flight stall speed at gross weight (same formula as the solver).
    const stallKts = Math.round(Math.sqrt(
      (2 * config.mass * 9.81) / (1.225 * config.wingArea * config.liftCoefficientMax)) * 1.944);
    const massT = (config.mass / 1000).toFixed(1);
    rows.innerHTML = `
      <div><span>Engine</span> <span>${config.engineType ?? 'Single Propeller'}</span></div>
      <div><span>Max Thrust</span> <span>${(config.maxThrust / 1000).toFixed(1)} kN</span></div>
      <div><span>Gross Weight</span> <span>${massT} t</span></div>
      <div><span>Wingspan</span> <span>${config.dimensions.span.toFixed(1)} m</span></div>
      <div><span>Top Speed</span> <span>${topSpeedKts} kts</span></div>
      <div><span>Stall Speed</span> <span>${stallKts} kts</span></div>
      <div><span>G-Limit</span> <span>${(config.pitchGScale ?? 6).toFixed(1)} G</span></div>
    `;

    // Relative stat bars, normalized against the top of the current fleet.
    const speedPct = Math.round(Math.min((config.terminalSpeed ?? 60) / 185, 1) * 100);
    const agilityPct = Math.round(Math.min(config.rollRate / 4.5, 1) * 100);
    const powerPct = Math.round(Math.min(config.maxThrust / (config.mass * 9.81), 1.15) / 1.15 * 100);
    const bar = (label, pct) => `
      <div class="stat-bar-row">
        <span class="stat-label">${label}</span>
        <div class="stat-track"><div class="stat-fill" style="width:${pct}%"></div></div>
      </div>`;
    bars.innerHTML = bar('SPEED', speedPct) + bar('AGILITY', agilityPct) + bar('POWER', powerPct);
  }

  renderAircraftCards() {
    const container = document.querySelector('.aircraft-cards-container');
    if (!container) return;
    container.innerHTML = '';

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    const configs = this.aircraftManager ? this.aircraftManager.configs : {};

    // Hangar order: light trainers first, heavies last. Unknown ids append at the end.
    const preferredOrder = ['trainer', 'stunt', 'glider', 'warbird', 'fighter', 'f14', 'f16', 'f22', 'f35', 'attack', 'sr71', 'b2', 'concorde', 'kc135', 'b52', 'cargo', 'debug'];
    const ids = Object.keys(configs).sort((a, b) => {
      const ia = preferredOrder.indexOf(a), ib = preferredOrder.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    // Keep the pilot's previous selection when the list re-renders.
    if (!ids.includes(this.selectedAircraftId) && ids.length > 0) {
      this.selectedAircraftId = ids[0];
    }

    ids.forEach((id) => {
      const config = configs[id];
      const card = document.createElement('div');
      card.className = `aircraft-card${id === this.selectedAircraftId ? ' selected' : ''}`;
      card.setAttribute('data-id', id);

      const desc = config.description || `Configured ${config.name} model.`;
      const badge = MenuManager.badgeFor(config);
      const topSpeedKts = Math.round((config.terminalSpeed ?? 60) * 1.944);
      card.innerHTML = `
        <div class="card-head">
          <span class="card-title">${config.name}</span>
          <span class="card-badge ${badge.cls}">${badge.label}</span>
        </div>
        <p class="description">${desc}</p>
        <div class="card-mini-specs">
          <span>${topSpeedKts} kt</span>
          <span>${(config.pitchGScale ?? 6).toFixed(1)} G</span>
          <span>${(config.mass / 1000).toFixed(1)} t</span>
        </div>
      `;
      container.appendChild(card);
    });

    this.cards = Array.from(document.querySelectorAll('.aircraft-card'));
    this.bindCardEvents();
  }

  update(deltaTime) {}
}