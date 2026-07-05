import * as THREE from 'three';

export class HardwareManager {
  constructor() {
    this.engine = null;
    this.drivers = [];
    
    // Unified state represents aggregated values across all active hardware
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

    // Register primary hardware drivers
    this.registerDriver(new GamepadDriver());
    this.registerDriver(new SerialDriver());

    // Initialize all registered drivers
    this.drivers.forEach((driver) => driver.init(engine));
  }

  registerDriver(driver) {
    this.drivers.push(driver);
  }

  update(deltaTime) {
    // Reset discrete trigger pulses before compiling new frame data
    this.unifiedState.flapsUp = false;
    this.unifiedState.flapsDown = false;
    this.unifiedState.gearToggle = false;
    this.unifiedState.airbrakeToggle = false;
    this.unifiedState.wheelBrakesToggle = false;
    this.unifiedState.pauseToggle = false;
    this.unifiedState.respawn = false;

    // Reset continuous analog axis values
    this.unifiedState.pitch = 0.0;
    this.unifiedState.roll = 0.0;
    this.unifiedState.yaw = 0.0;
    this.unifiedState.throttleDelta = 0.0;

    // Poll drivers and pool inputs
    for (const driver of this.drivers) {
      if (typeof driver.update === 'function') {
        driver.update(deltaTime);
      }

      if (driver.isActive()) {
        const state = driver.getState();

        // Standard 5% analog deadzone filtering to avoid stick drift
        if (Math.abs(state.pitch) > 0.05) this.unifiedState.pitch = state.pitch;
        if (Math.abs(state.roll) > 0.05) this.unifiedState.roll = state.roll;
        if (Math.abs(state.yaw) > 0.05) this.unifiedState.yaw = state.yaw;
        if (Math.abs(state.throttleDelta) > 0.05) this.unifiedState.throttleDelta = state.throttleDelta;

        // Combine discrete trigger pulses
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

/**
 * Standard Gamepad API Input Driver (Xbox Controller Mappings)
 */
class GamepadDriver {
  constructor() {
    this.engine = null;
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
    this.engine = engine;
    
    window.addEventListener('gamepadconnected', (e) => {
      console.log(`[GamepadDriver] Controller detected: ${e.gamepad.id}`);
      this.active = true;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log(`[GamepadDriver] Controller disconnected: ${e.gamepad.id}`);
      this.active = false;
    });
  }

  isActive() {
    return this.active;
  }

  getState() {
    return this.state;
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

    // Edge-trigger evaluation helper to prevent multiple action registrations on a single click
    const isJustPressed = (index) => {
      const button = gp.buttons[index];
      if (!button) return false;
      const pressed = button.pressed;
      const wasPressed = !!this.prevButtons[index];
      this.prevButtons[index] = pressed;
      return pressed && !wasPressed;
    };

    // Axes Assignments
    this.state.roll = gp.axes[0] || 0.0;   // Left Stick X
    this.state.pitch = gp.axes[1] || 0.0;  // Left Stick Y (Positive axis down, mapping matches aircraft controls)

    // LT (Button 6) & RT (Button 7) act as progressive rudder controls
    const ltVal = gp.buttons[6] ? gp.buttons[6].value : 0.0;
    const rtVal = gp.buttons[7] ? gp.buttons[7].value : 0.0;
    this.state.yaw = rtVal - ltVal;

    // LB (Button 4) & RB (Button 5) modulate absolute throttle states
    const lbPressed = gp.buttons[4] ? gp.buttons[4].pressed : false;
    const rbPressed = gp.buttons[5] ? gp.buttons[5].pressed : false;
    
    this.state.throttleDelta = 0.0;
    if (rbPressed) this.state.throttleDelta += 1.0;
    if (lbPressed) this.state.throttleDelta -= 1.0;

    // Trigger Mappings
    this.state.gearToggle = isJustPressed(2);        // X Button
    this.state.flapsUp = isJustPressed(12);          // D-Pad Up
    this.state.flapsDown = isJustPressed(13);        // D-Pad Down
    this.state.airbrakeToggle = isJustPressed(10);   // Left Stick Press (L3)
    this.state.wheelBrakesToggle = isJustPressed(11); // Right Stick Press (R3)
    this.state.pauseToggle = isJustPressed(9);       // Start / Menu Button
    
    // A Button (Button 0) acts as standard respawn key if the aircraft is grounded/crashed
    this.state.respawn = isJustPressed(0);
  }
}

/**
 * Extensible Serial / USB Interface Receiver Driver
 * Adapts incoming serial string commands from Electron's IPC channel.
 */
class SerialDriver {
  constructor() {
    this.engine = null;
    this.active = false;
    this.lastSignalTime = 0;
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
  }

  init(engine) {
    this.engine = engine;

    // Bind event handler directly to standard Electron IPC API context exposure
    if (window.electronAPI && typeof window.electronAPI.receiveHardwareData === 'function') {
      window.electronAPI.receiveHardwareData((event, rawData) => {
        this.parseSerialSignal(rawData);
      });
    }
  }

  isActive() {
    return this.active;
  }

  getState() {
    return this.state;
  }

  /**
   * Decodes serial streams. Allows straightforward adjustment for various protocols.
   * Example expected stream format: "P:0.15,R:-0.40,Y:0.00,G:1\n"
   */
  parseSerialSignal(dataString) {
    if (!dataString || typeof dataString !== 'string') return;
    
    this.active = true;
    this.lastSignalTime = performance.now();

    try {
      // Clear trigger indicators upon receiving fresh payload
      this.state.gearToggle = false;
      this.state.flapsUp = false;
      this.state.flapsDown = false;
      this.state.airbrakeToggle = false;
      this.state.wheelBrakesToggle = false;
      this.state.pauseToggle = false;
      this.state.respawn = false;
      this.state.throttleDelta = 0.0;

      const segments = dataString.trim().split(',');
      
      segments.forEach((segment) => {
        const parts = segment.split(':');
        if (parts.length !== 2) return;

        const command = parts[0].trim().toUpperCase();
        const value = parseFloat(parts[1].trim());

        switch (command) {
          case 'P':  // Pitch
            this.state.pitch = value;
            break;
          case 'R':  // Roll
            this.state.roll = value;
            break;
          case 'Y':  // Yaw
            this.state.yaw = value;
            break;
          case 'TD': // Throttle Delta
            this.state.throttleDelta = value;
            break;
          case 'G':  // Landing Gear Toggle
            if (value === 1) this.state.gearToggle = true;
            break;
          case 'FU': // Flaps Up Stage
            if (value === 1) this.state.flapsUp = true;
            break;
          case 'FD': // Flaps Down Stage
            if (value === 1) this.state.flapsDown = true;
            break;
          case 'AB': // Speedbrakes Toggle
            if (value === 1) this.state.airbrakeToggle = true;
            break;
          case 'B':  // Wheel brakes Toggle
            if (value === 1) this.state.wheelBrakesToggle = true;
            break;
          case 'PA': // Pause Menu Toggle
            if (value === 1) this.state.pauseToggle = true;
            break;
          case 'RE': // Respawn Flight State
            if (value === 1) this.state.respawn = true;
            break;
        }
      });
    } catch (error) {
      console.warn('[SerialDriver] Failed to process incoming serial command payload:', error);
    }
  }

  update(deltaTime) {
    // Watchdog check to disconnect the hardware state if data packets cease to arrive
    if (this.active) {
      const now = performance.now();
      if (now - this.lastSignalTime > 3000) {
        this.active = false;
      }
    }
  }
}