export class SettingsMenu {
  constructor() {
    this.engine = null;
    this.isOpen = false;
    this.modal = null;
    this.btnSettingsToggle = null;
    this.btnGameSettingsToggle = null;
    this.btnSave = null;
    this.btnClose = null;
    this.checkboxMute = null;
    this.checkboxGEffects = null;
    this.checkboxCamShake = null;
    this.checkboxWind = null;
    this.checkboxILS = null;
    this.enableGEffects = true;
    this.enableCamShake = true;
    this.enableWind = true;
    this.enableILS = true;
    this.sliders = {
      master: null,
      engine: null,
      wind: null,
      effects: null
    };
    this.displays = {
      master: null,
      engine: null,
      wind: null,
      effects: null
    };
  }
  init(engine) {
    this.engine = engine;
    this.modal = document.getElementById('hud-settings-modal');
    this.btnSettingsToggle = document.getElementById('menu-btn-settings');
    this.btnGameSettingsToggle = document.getElementById('game-menu-settings-btn');
    this.btnSave = document.getElementById('settings-save-btn');
    this.btnClose = document.getElementById('settings-close-btn');
    this.checkboxMute = document.getElementById('checkbox-mute-sound');
    this.checkboxGEffects = document.getElementById('checkbox-g-effects');
    this.checkboxCamShake = document.getElementById('checkbox-cam-shake');
    this.checkboxWind = document.getElementById('checkbox-wind-effects');
    this.checkboxILS = document.getElementById('checkbox-ils-display');
    this.sliders.master = document.getElementById('slider-master-vol');
    this.sliders.engine = document.getElementById('slider-engine-vol');
    this.sliders.wind = document.getElementById('slider-wind-vol');
    this.sliders.effects = document.getElementById('slider-effects-vol');
    this.displays.master = document.getElementById('val-master-vol');
    this.displays.engine = document.getElementById('val-engine-vol');
    this.displays.wind = document.getElementById('val-wind-vol');
    this.displays.effects = document.getElementById('val-effects-vol');
    this.bindEvents();
    this.loadSavedConfiguration();
  }
  bindEvents() {
    if (this.btnSettingsToggle) {
      this.btnSettingsToggle.addEventListener('click', () => this.openSettings());
    }
    if (this.btnGameSettingsToggle) {
      this.btnGameSettingsToggle.addEventListener('click', () => {
        const menuManager = this.engine.moduleManager.get('Menu');
        if (menuManager) {
          menuManager.closeMenu();
        }
        this.openSettings();
      });
    }
    if (this.btnSave) {
      this.btnSave.addEventListener('click', () => this.saveConfiguration());
    }
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.closeSettings());
    }
    if (this.checkboxMute) {
      this.checkboxMute.addEventListener('change', () => {
        this.applyVolumesRealtime();
      });
    }
    const parameterCheckboxes = [this.checkboxGEffects, this.checkboxCamShake, this.checkboxWind, this.checkboxILS];
    parameterCheckboxes.forEach((cb) => {
      if (cb) {
        cb.addEventListener('change', () => this.applyVolumesRealtime());
      }
    });
    Object.keys(this.sliders).forEach((key) => {
      const slider = this.sliders[key];
      const display = this.displays[key];
      if (slider && display) {
        slider.addEventListener('input', () => {
          display.textContent = `${Math.round(slider.value * 100)}%`;
          this.applyVolumesRealtime();
        });
      }
    });
  }
  openSettings() {
    if (!this.modal) return;
    this.isOpen = true;
    this.modal.classList.remove('hidden');
  }
  closeSettings() {
    if (!this.modal) return;
    this.isOpen = false;
    this.modal.classList.add('hidden');
    this.loadSavedConfiguration();
  }
  loadSavedConfiguration() {
    const master = localStorage.getItem('flight_vol_master') ?? '0.80';
    const engine = localStorage.getItem('flight_vol_engine') ?? '0.70';
    const wind = localStorage.getItem('flight_vol_wind') ?? '0.50';
    const effects = localStorage.getItem('flight_vol_effects') ?? '0.60';
    const muted = localStorage.getItem('flight_vol_muted') === 'true';
    if (this.sliders.master) this.sliders.master.value = master;
    if (this.sliders.engine) this.sliders.engine.value = engine;
    if (this.sliders.wind) this.sliders.wind.value = wind;
    if (this.sliders.effects) this.sliders.effects.value = effects;
    if (this.checkboxMute) this.checkboxMute.checked = muted;
    const restoreToggle = (checkbox, storageKey) => {
      if (!checkbox) return;
      const saved = localStorage.getItem(storageKey);
      checkbox.checked = (saved === null) ? true : (saved === 'true');
    };
    restoreToggle(this.checkboxGEffects, 'flight_g_effects');
    restoreToggle(this.checkboxCamShake, 'flight_cam_shake');
    restoreToggle(this.checkboxWind, 'flight_wind_effects');
    restoreToggle(this.checkboxILS, 'flight_ils_display');
    Object.keys(this.sliders).forEach((key) => {
      if (this.displays[key] && this.sliders[key]) {
        this.displays[key].textContent = `${Math.round(this.sliders[key].value * 100)}%`;
      }
    });
    this.applyVolumesRealtime();
  }
  saveConfiguration() {
    localStorage.setItem('flight_vol_master', this.sliders.master.value);
    localStorage.setItem('flight_vol_engine', this.sliders.engine.value);
    localStorage.setItem('flight_vol_wind', this.sliders.wind.value);
    localStorage.setItem('flight_vol_effects', this.sliders.effects.value);
    localStorage.setItem('flight_vol_muted', this.checkboxMute && this.checkboxMute.checked ? 'true' : 'false');
    localStorage.setItem('flight_g_effects', this.checkboxGEffects && this.checkboxGEffects.checked ? 'true' : 'false');
    localStorage.setItem('flight_cam_shake', this.checkboxCamShake && this.checkboxCamShake.checked ? 'true' : 'false');
    localStorage.setItem('flight_wind_effects', this.checkboxWind && this.checkboxWind.checked ? 'true' : 'false');
    localStorage.setItem('flight_ils_display', this.checkboxILS && this.checkboxILS.checked ? 'true' : 'false');
    this.applyVolumesRealtime();
    this.closeSettings();
    console.log(`[SettingsMenu] Saved audio configuration parameters successfully.`);
  }
  applyVolumesRealtime() {
    const soundManager = this.engine.moduleManager.get('Sound');
    if (soundManager) {
      const isMuted = this.checkboxMute ? this.checkboxMute.checked : false;
      soundManager.isMuted = isMuted;
      soundManager.masterVolumeScale = isMuted ? 0.0 : parseFloat(this.sliders.master.value);
      soundManager.engineVolumeScale = parseFloat(this.sliders.engine.value);
      soundManager.windVolumeScale = parseFloat(this.sliders.wind.value);
      soundManager.effectsVolumeScale = parseFloat(this.sliders.effects.value);
    }
    this.enableGEffects = this.checkboxGEffects ? this.checkboxGEffects.checked : true;
    this.enableCamShake = this.checkboxCamShake ? this.checkboxCamShake.checked : true;
    this.enableWind = this.checkboxWind ? this.checkboxWind.checked : true;
    this.enableILS = this.checkboxILS ? this.checkboxILS.checked : true;
  }
  update(deltaTime) {
  }
}