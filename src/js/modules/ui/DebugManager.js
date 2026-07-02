import * as THREE from 'three';
import { AircraftConfig } from '../../aircraft/AircraftConfig.js';

export class DebugManager {
  constructor() {
    this.enabled = false; // Set to true to enable the debug panel
    this.engine = null;
    this.aircraftManager = null;
    this.panelElement = null;
    this.textarea = null;
    this.collisionBoxMesh = null;
    this.synced = false;
    this.currentAircraftId = null;
  }

  init(engine) {
    this.engine = engine;
    if (!this.enabled) return;
    this.buildDebugUI();
  }

  buildDebugUI() {
    this.panelElement = document.createElement('div');
    this.panelElement.id = 'hud-debug-panel';
    this.panelElement.style.cssText = `
      position: absolute;
      top: 85px;
      right: 40px;
      width: 320px;
      max-height: 80%;
      background: rgba(10, 15, 20, 0.95);
      border: 1.5px solid #ff0055;
      border-radius: 4px;
      padding: 16px;
      color: #ff0055;
      font-family: Consolas, monospace;
      font-size: 11px;
      z-index: 200;
      overflow-y: auto;
      pointer-events: auto;
      box-shadow: 0 0 15px rgba(255, 0, 85, 0.3);
    `;

    this.panelElement.innerHTML = `
      <h3 style="margin-bottom: 12px; border-bottom: 1px solid #ff0055; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">Visual & Collision Debugger</h3>
      
      <div style="margin-bottom: 14px;">
        <h4 style="margin-bottom: 6px; color: #ffffff;">Model Scale (XYZ)</h4>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
          <span>X:</span><input type="range" id="debug-scale-x" min="0.001" max="10" step="0.01" value="1" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-scale-x" style="width:30px; text-align:right;">1.00</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
          <span>Y:</span><input type="range" id="debug-scale-y" min="0.001" max="10" step="0.01" value="1" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-scale-y" style="width:30px; text-align:right;">1.00</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span>Z:</span><input type="range" id="debug-scale-z" min="0.001" max="10" step="0.01" value="1" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-scale-z" style="width:30px; text-align:right;">1.00</span>
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <h4 style="margin-bottom: 6px; color: #ffffff;">Model Rotation (XYZ Degrees)</h4>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
          <span>X:</span><input type="range" id="debug-rot-x" min="-180" max="180" step="1" value="0" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-rot-x" style="width:30px; text-align:right;">0°</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
          <span>Y:</span><input type="range" id="debug-rot-y" min="-180" max="180" step="1" value="0" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-rot-y" style="width:30px; text-align:right;">0°</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span>Z:</span><input type="range" id="debug-rot-z" min="-180" max="180" step="1" value="0" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-rot-z" style="width:30px; text-align:right;">0°</span>
        </div>
      </div>

      <div style="margin-bottom: 14px;">
        <h4 style="margin-bottom: 6px; color: #ffffff;">Model Position (XYZ)</h4>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
          <span>X:</span><input type="range" id="debug-pos-x" min="-10" max="10" step="0.05" value="0" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-pos-x" style="width:30px; text-align:right;">0.00</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 4px;">
          <span>Y:</span><input type="range" id="debug-pos-y" min="-10" max="10" step="0.05" value="0" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-pos-y" style="width:30px; text-align:right;">0.00</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span>Z:</span><input type="range" id="debug-pos-z" min="-10" max="10" step="0.05" value="0" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-pos-z" style="width:30px; text-align:right;">0.00</span>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="margin-bottom: 6px; color: #ffffff;">Ground Clearance Offset</h4>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span>H:</span><input type="range" id="debug-clearance" min="0.2" max="6.0" step="0.05" value="1.2" style="flex-grow: 1; accent-color: #ff0055;"><span id="lbl-clearance" style="width:30px; text-align:right;">1.20m</span>
        </div>
      </div>

      <div style="margin-bottom: 8px;">
        <h4 style="margin-bottom: 6px; color: #ffffff;">Copied JSON Config</h4>
        <textarea id="debug-json-area" readonly style="width: 100%; height: 110px; background: #0c0f12; border: 1px solid rgba(255,0,85,0.4); color: #00ff66; font-family: monospace; font-size: 9px; padding: 6px; resize: none; border-radius: 2px; scrollbar-width: thin; scrollbar-color: #ff0055 #0c0f12;"></textarea>
      </div>

      <button id="debug-copy-btn" style="width: 100%; padding: 8px; background: #ff0055; border: none; border-radius: 3px; color: #ffffff; font-family: monospace; font-weight: bold; cursor: pointer; text-transform: uppercase;">Copy Config</button>
    `;

    document.body.appendChild(this.panelElement);
    this.textarea = document.getElementById('debug-json-area');

    this.bindEvents();
  }

  bindEvents() {
    const ids = [
      'scale-x', 'scale-y', 'scale-z',
      'rot-x', 'rot-y', 'rot-z',
      'pos-x', 'pos-y', 'pos-z',
      'clearance'
    ];

    ids.forEach((id) => {
      const el = document.getElementById(`debug-${id}`);
      if (el) {
        el.addEventListener('input', () => this.applyDebugValues());
      }
    });

    const copyBtn = document.getElementById('debug-copy-btn');
    if (copyBtn && this.textarea) {
      copyBtn.addEventListener('click', () => {
        this.textarea.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Config'; }, 1000);
      });
    }
  }

  applyDebugValues() {
    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

    const aircraft = this.aircraftManager.activeAircraft;
    const config = aircraft.config;

    const sx = parseFloat(document.getElementById('debug-scale-x').value);
    const sy = parseFloat(document.getElementById('debug-scale-y').value);
    const sz = parseFloat(document.getElementById('debug-scale-z').value);

    const rx = parseFloat(document.getElementById('debug-rot-x').value);
    const ry = parseFloat(document.getElementById('debug-rot-y').value);
    const rz = parseFloat(document.getElementById('debug-rot-z').value);

    const px = parseFloat(document.getElementById('debug-pos-x').value);
    const py = parseFloat(document.getElementById('debug-pos-y').value);
    const pz = parseFloat(document.getElementById('debug-pos-z').value);

    const clearance = parseFloat(document.getElementById('debug-clearance').value);

    document.getElementById('lbl-scale-x').textContent = sx.toFixed(2);
    document.getElementById('lbl-scale-y').textContent = sy.toFixed(2);
    document.getElementById('lbl-scale-z').textContent = sz.toFixed(2);

    document.getElementById('lbl-rot-x').textContent = `${rx}°`;
    document.getElementById('lbl-rot-y').textContent = `${ry}°`;
    document.getElementById('lbl-rot-z').textContent = `${rz}°`;

    document.getElementById('lbl-pos-x').textContent = px.toFixed(2);
    document.getElementById('lbl-pos-y').textContent = py.toFixed(2);
    document.getElementById('lbl-pos-z').textContent = pz.toFixed(2);

    document.getElementById('lbl-clearance').textContent = `${clearance.toFixed(2)}m`;

    config.modelScale = { x: sx, y: sy, z: sz };
    config.modelRotation = { x: rx, y: ry, z: rz };
    config.modelPosition = { x: px, y: py, z: pz };
    config.groundClearanceOffset = clearance;

    if (aircraft.visualGroup) {
      aircraft.visualGroup.scale.set(sx, sy, sz);
      aircraft.visualGroup.rotation.set(
        rx * (Math.PI / 180),
        ry * (Math.PI / 180),
        rz * (Math.PI / 180)
      );
      aircraft.visualGroup.position.set(px, py, pz);
    }

    this.updateCollisionBox(aircraft);

    if (this.textarea) {
      this.textarea.value = JSON.stringify(config, null, 2);
    }
  }

  updateCollisionBox(aircraft) {
    const config = aircraft.config;
    if (!config || !config.dimensions) return;

    if (this.collisionBoxMesh) {
      aircraft.group.remove(this.collisionBoxMesh);
      this.collisionBoxMesh.geometry.dispose();
      this.collisionBoxMesh.material.dispose();
      this.collisionBoxMesh = null;
    }

    const span = config.dimensions.span || 10.0;
    const height = config.dimensions.height || 3.0;
    const length = config.dimensions.length || 8.0;

    const geo = new THREE.BoxGeometry(span, height, length);
    const edges = new THREE.EdgesGeometry(geo);
    
    const mat = new THREE.LineBasicMaterial({ 
      color: 0x00ff66, 
      linewidth: 2.0 
    });

    this.collisionBoxMesh = new THREE.LineSegments(edges, mat);
    
    const clearance = config.groundClearanceOffset ?? 1.2;
    this.collisionBoxMesh.position.set(0, (height / 2) - clearance, 0);

    aircraft.group.add(this.collisionBoxMesh);
  }

  syncSliders() {
    if (!this.panelElement || !this.enabled) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }
    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

    const aircraft = this.aircraftManager.activeAircraft;
    const config = aircraft.config;

    const scale = config.modelScale || { x: 1.0, y: 1.0, z: 1.0 };
    const rot = config.modelRotation || { x: 0.0, y: 0.0, z: 0.0 };
    const pos = config.modelPosition || { x: 0.0, y: 0.0, z: 0.0 };
    const clearance = config.groundClearanceOffset ?? 1.2;

    document.getElementById('debug-scale-x').value = scale.x;
    document.getElementById('debug-scale-y').value = scale.y;
    document.getElementById('debug-scale-z').value = scale.z;

    document.getElementById('debug-rot-x').value = rot.x;
    document.getElementById('debug-rot-y').value = rot.y;
    document.getElementById('debug-rot-z').value = rot.z;

    document.getElementById('debug-pos-x').value = pos.x;
    document.getElementById('debug-pos-y').value = pos.y;
    document.getElementById('debug-pos-z').value = pos.z;

    document.getElementById('debug-clearance').value = clearance;

    this.updateCollisionBox(aircraft);
    this.applyDebugValues();
  }

  update(deltaTime) {
    const aircraftManager = this.engine.moduleManager.get('Aircraft');
    if (aircraftManager && aircraftManager.activeAircraft && !this.synced) {
      this.syncSliders();
      this.synced = true;
    }
    
    if (aircraftManager && aircraftManager.activeAircraft) {
      if (this.currentAircraftId !== aircraftManager.activeAircraft.config.id) {
        this.currentAircraftId = aircraftManager.activeAircraft.config.id;
        this.syncSliders();
      }
    }
  }
}