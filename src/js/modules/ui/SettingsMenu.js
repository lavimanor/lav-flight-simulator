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
    // Controller settings bindings
    this.sliderDeadzone = document.getElementById('slider-ctrl-deadzone');
    this.sliderCurve = document.getElementById('slider-ctrl-curve');
    this.valDeadzone = document.getElementById('val-ctrl-deadzone');
    this.valCurve = document.getElementById('val-ctrl-curve');
    
    this.selectBinds = {
      gear: document.getElementById('bind-gear'),
      ignition: document.getElementById('bind-ignition'),
      respawn: document.getElementById('bind-respawn')
    };

    // Cache gamepad visualizer nodes
    this.previewRoll = document.getElementById('preview-axis-roll');
    this.previewPitch = document.getElementById('preview-axis-pitch');
    this.previewYaw = document.getElementById('preview-axis-yaw');
    this.previewThr = document.getElementById('preview-axis-thr');
    this.previewActiveButtons = document.getElementById('preview-active-buttons');
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
    if (this.sliderDeadzone) {
      this.sliderDeadzone.addEventListener('input', () => {
        if (this.valDeadzone) this.valDeadzone.textContent = `${Math.round(this.sliderDeadzone.value * 100)}%`;
      });
    }
    if (this.sliderCurve) {
      this.sliderCurve.addEventListener('input', () => {
        if (this.valCurve) this.valCurve.textContent = `${parseFloat(this.sliderCurve.value).toFixed(1)}x`;
      });
    }
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
    const dz = localStorage.getItem('flight_ctrl_deadzone') ?? '0.05';
    const curve = localStorage.getItem('flight_ctrl_curve') ?? '1.5';
    if (this.sliderDeadzone) {
      this.sliderDeadzone.value = dz;
      if (this.valDeadzone) this.valDeadzone.textContent = `${Math.round(dz * 100)}%`;
    }
    if (this.sliderCurve) {
      this.sliderCurve.value = curve;
      if (this.valCurve) this.valCurve.textContent = `${parseFloat(curve).toFixed(1)}x`;
    }

    const savedGear = localStorage.getItem('flight_bind_gear') ?? '2';
    const savedIgnition = localStorage.getItem('flight_bind_ignition') ?? '3';
    const savedRespawn = localStorage.getItem('flight_bind_respawn') ?? '0';

    if (this.selectBinds.gear) this.selectBinds.gear.value = savedGear;
    if (this.selectBinds.ignition) this.selectBinds.ignition.value = savedIgnition;
    if (this.selectBinds.respawn) this.selectBinds.respawn.value = savedRespawn;
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
    localStorage.setItem('flight_ctrl_deadzone', this.sliderDeadzone.value);
    localStorage.setItem('flight_ctrl_curve', this.sliderCurve.value);
    localStorage.setItem('flight_bind_gear', this.selectBinds.gear.value);
    localStorage.setItem('flight_bind_ignition', this.selectBinds.ignition.value);
    localStorage.setItem('flight_bind_respawn', this.selectBinds.respawn.value);

    // Sync variables immediately with the running Hardware manager state
    const hardwareManager = this.engine.moduleManager.get('Hardware');
    if (hardwareManager) {
      hardwareManager.loadInputConfiguration();
    }
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
    if (!this.isOpen) return;

    // Query running axes and buttons to update the live visual preview container
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let activeGp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) { activeGp = gamepads[i]; break; }
    }

    // Helper utility to position bipolar deviations from the center line (50%).
    // The stylesheet centres the idle fill with translateX(-50%), which must be
    // cleared here or every deflection renders shifted by half its own width.
    const updateBipolarBar = (barElement, value) => {
      if (!barElement) return;
      barElement.style.transform = 'none';
      const clamped = Math.max(-1, Math.min(1, value));
      if (clamped >= 0) {
        barElement.style.width = `${clamped * 50}%`;
        barElement.style.left = '50%';
        barElement.style.right = 'auto';
      } else {
        barElement.style.width = `${Math.abs(clamped) * 50}%`;
        barElement.style.left = 'auto';
        barElement.style.right = '50%';
      }
    };

    if (!activeGp) {
      if (this.previewActiveButtons) {
        this.previewActiveButtons.textContent = "Connect a gamepad to verify inputs.";
      }
      // Park the axis bars at neutral so stale deflections don't linger.
      updateBipolarBar(this.previewRoll, 0);
      updateBipolarBar(this.previewPitch, 0);
      updateBipolarBar(this.previewYaw, 0);
      return;
    }

    const rollVal = activeGp.axes[0] || 0;
    const pitchVal = activeGp.axes[1] || 0;

    const lt = activeGp.buttons[6] ? activeGp.buttons[6].value : 0;
    const rt = activeGp.buttons[7] ? activeGp.buttons[7].value : 0;
    const yawVal = rt - lt;

    const aircraftManager = this.engine.moduleManager.get('Aircraft');
    const activeAircraft = aircraftManager ? aircraftManager.activeAircraft : null;
    const currentThrottlePct = activeAircraft ? activeAircraft.controls.throttle * 100 : 0;

    updateBipolarBar(this.previewRoll, rollVal);
    updateBipolarBar(this.previewPitch, pitchVal);
    updateBipolarBar(this.previewYaw, yawVal);

    // Throttle bar is uni-directional, filling from left to right (0% to 100%)
    if (this.previewThr) {
      this.previewThr.style.width = `${Math.min(currentThrottlePct, 100)}%`;
      this.previewThr.style.left = '0';
      this.previewThr.style.right = 'auto';
    }

    // Highlight active button inputs
    const pressed = [];
    activeGp.buttons.forEach((btn, index) => {
      if (btn.pressed) pressed.push(index);
    });
    if (this.previewActiveButtons) {
      this.previewActiveButtons.textContent = pressed.length > 0 
        ? `Active Buttons: ${pressed.join(', ')}` 
        : 'Active Buttons: None';
    }
  }
}