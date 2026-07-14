import * as THREE from 'three';

export class HardwareManager {
  constructor() {
    this.engine = null;
    this.drivers = [];
    
    // Tracks current device style to swap key labels dynamically on screen
    this.lastInputDevice = 'keyboard'; // 'keyboard' | 'gamepad'

    // Stick adjustments loaded from storage or set as safe defaults
    this.sensitivityConfig = {
      deadzone: 0.05,
      curveExponent: 1.5
    };

    // Mapping indexes on Xbox controller to operational commands
    this.customBinds = {
      gear: 2,       // Default Button X
      ignition: 3,   // Default Button Y
      respawn: 0     // Default Button A
    };

    this.unifiedState = {
      pitch: 0.0,
      roll: 0.0,
      yaw: 0.0,
      throttleDelta: 0.0,
      flapsUp: false,
      flapsDown: false,
      gearToggle: false,
      airbrakeToggle: false,
      wheelBrakesToggle: false,
      pauseToggle: false,
      respawn: false
    };
  }

  init(engine) {
    this.engine = engine;
    this.loadInputConfiguration();

    this.registerDriver(new GamepadDriver(this));
    this.registerDriver(new SerialDriver());

    this.drivers.forEach((driver) => driver.init(engine));
  }

  loadInputConfiguration() {
    this.sensitivityConfig.deadzone = parseFloat(localStorage.getItem('flight_ctrl_deadzone') ?? '0.05');
    this.sensitivityConfig.curveExponent = parseFloat(localStorage.getItem('flight_ctrl_curve') ?? '1.5');
    this.customBinds.gear = parseInt(localStorage.getItem('flight_bind_gear') ?? '2', 10);
    this.customBinds.ignition = parseInt(localStorage.getItem('flight_bind_ignition') ?? '3', 10);
    this.customBinds.respawn = parseInt(localStorage.getItem('flight_bind_respawn') ?? '0', 10);
  }

  registerDriver(driver) {
    this.drivers.push(driver);
  }

  update(deltaTime) {
    this.unifiedState.flapsUp = false;
    this.unifiedState.flapsDown = false;
    this.unifiedState.gearToggle = false;
    this.unifiedState.airbrakeToggle = false;
    this.unifiedState.wheelBrakesToggle = false;
    this.unifiedState.pauseToggle = false;
    this.unifiedState.respawn = false;

    this.unifiedState.pitch = 0.0;
    this.unifiedState.roll = 0.0;
    this.unifiedState.yaw = 0.0;
    this.unifiedState.throttleDelta = 0.0;

    for (const driver of this.drivers) {
      if (typeof driver.update === 'function') {
        driver.update(deltaTime);
      }

      if (driver.isActive()) {
        const state = driver.getState();

        if (Math.abs(state.pitch) > 0.01) this.unifiedState.pitch = state.pitch;
        if (Math.abs(state.roll) > 0.01) this.unifiedState.roll = state.roll;
        if (Math.abs(state.yaw) > 0.01) this.unifiedState.yaw = state.yaw;
        if (Math.abs(state.throttleDelta) > 0.01) this.unifiedState.throttleDelta = state.throttleDelta;

        if (state.flapsUp) this.unifiedState.flapsUp = true;
        if (state.flapsDown) this.unifiedState.flapsDown = true;
        if (state.gearToggle) this.unifiedState.gearToggle = true;
        if (state.airbrakeToggle) this.unifiedState.airbrakeToggle = true;
        if (state.wheelBrakesToggle) this.unifiedState.wheelBrakesToggle = true;
        if (state.pauseToggle) this.unifiedState.pauseToggle = true;
        if (state.respawn) this.unifiedState.respawn = true;
      }
    }
  }
}

class GamepadDriver {
  constructor(hardwareManager) {
    this.hardwareManager = hardwareManager;
    this.active = false;
    this.state = {
      pitch: 0.0,
      roll: 0.0,
      yaw: 0.0,
      throttleDelta: 0.0,
      flapsUp: false,
      flapsDown: false,
      gearToggle: false,
      airbrakeToggle: false,
      wheelBrakesToggle: false,
      pauseToggle: false,
      respawn: false
    };
    this.prevButtons = {};
  }

  init(engine) {
    window.addEventListener('gamepadconnected', (e) => {
      console.log(`[GamepadDriver] Controller detected: ${e.gamepad.id}`);
      this.active = true;
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      this.active = false;
    });
  }

  isActive() {
    return this.active;
  }

  getState() {
    return this.state;
  }

  applyStickMath(rawVal) {
    const dz = this.hardwareManager.sensitivityConfig.deadzone;
    const exp = this.hardwareManager.sensitivityConfig.curveExponent;
    const absVal = Math.abs(rawVal);
    if (absVal <= dz) return 0.0;
    
    // Scale out stick curve progressively above deadzone threshold
    const normVal = (absVal - dz) / (1.0 - dz);
    return Math.sign(rawVal) * Math.pow(normVal, exp);
  }

  update(deltaTime) {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        this.active = true;
        break;
      }
    }

    if (!gp) {
      this.active = false;
      return;
    }

    // Capture hardware stick states to identify active device transitions
    const rx = gp.axes[0] || 0.0;
    const ry = gp.axes[1] || 0.0;
    const anyPressed = gp.buttons.some(b => b.pressed);

    if (Math.abs(rx) > 0.08 || Math.abs(ry) > 0.08 || anyPressed) {
      this.hardwareManager.lastInputDevice = 'gamepad';
    }

    const isJustPressed = (index) => {
      const button = gp.buttons[index];
      if (!button) return false;
      const pressed = button.pressed;
      const wasPressed = !!this.prevButtons[index];
      this.prevButtons[index] = pressed;
      return pressed && !wasPressed;
    };

    // Calculate sensitivity-corrected analog states
    this.state.roll = this.applyStickMath(gp.axes[0] || 0.0);
    this.state.pitch = this.applyStickMath(gp.axes[1] || 0.0);

    const ltVal = gp.buttons[6] ? gp.buttons[6].value : 0.0;
    const rtVal = gp.buttons[7] ? gp.buttons[7].value : 0.0;
    this.state.yaw = this.applyStickMath(rtVal - ltVal);

    const lbPressed = gp.buttons[4] ? gp.buttons[4].pressed : false;
    const rbPressed = gp.buttons[5] ? gp.buttons[5].pressed : false;
    this.state.throttleDelta = 0.0;
    if (rbPressed) this.state.throttleDelta += 1.0;
    if (lbPressed) this.state.throttleDelta -= 1.0;

    // Command Dispatching driven by the customized mappings object
    const binds = this.hardwareManager.customBinds;
    this.state.gearToggle = isJustPressed(binds.gear);
    this.state.respawn = isJustPressed(binds.respawn);
    
    // Dynamic defaults mapped for general features
    this.state.flapsUp = isJustPressed(12);          // D-Pad Up
    this.state.flapsDown = isJustPressed(13);        // D-Pad Down
    this.state.airbrakeToggle = isJustPressed(10);   // L3
    this.state.wheelBrakesToggle = isJustPressed(11); // R3
    this.state.pauseToggle = isJustPressed(9);       // Start / Menu
  }
}

class SerialDriver {
  constructor() {
    this.active = false;
    this.state = {};
  }
  init() {}
  isActive() { return false; }
  getState() { return this.state; }
}