import * as THREE from 'three';
import { FlightPathVector } from './hud/FlightPathVector.js';
import { ILSIndicator } from './hud/ILSIndicator.js';

export class HudManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.cameraManager = null;

    // Cached DOM references
    this.speedVal = null;
    this.altitudeVal = null;
    this.headingVal = null;
    this.throttleVal = null;
    this.throttleBar = null;
    this.rpmVal = null;
    this.vsVal = null;
    this.pitchLadder = null;
    this.headingTape = null;

    // Advanced Systems overlays
    this.fuelVal = null;
    this.gForceVal = null;
    this.blackoutOverlay = null;
    this.redoutOverlay = null;
    this.stallWarning = null;
    this.spinWarning = null;

    // Takeoff/Landing panels
    this.gearVal = null;
    this.flapsVal = null;
    this.brakesWarning = null;
    this.scrapeWarning = null;
    this.crashWarning = null; 

    // Engine Toggle and Airbrakes HUD overlays
    this.engineWarning = null;
    this.airbrakesWarning = null;
    this.abWarning = null;

    // Modularized HUD components
    this.fpvComponent = null;
    this.ilsComponent = null;
  }

  init(engine) {
    this.engine = engine;

    // Cache HUD DOM references
    this.speedVal = document.getElementById('hud-speed-val');
    this.altitudeVal = document.getElementById('hud-altitude-val');
    this.headingVal = document.getElementById('hud-heading-val');
    this.throttleVal = document.getElementById('hud-throttle-val');
    this.throttleBar = document.getElementById('hud-throttle-bar');
    this.rpmVal = document.getElementById('hud-rpm-val');
    this.vsVal = document.getElementById('hud-vs-val');
    this.pitchLadder = document.getElementById('hud-pitch-ladder');
    this.headingTape = document.getElementById('hud-heading-tape-scroll');

    // Cache Advanced elements
    this.fuelVal = document.getElementById('hud-fuel-val');
    this.gForceVal = document.getElementById('hud-gforce-val');
    this.blackoutOverlay = document.getElementById('hud-blackout-overlay');
    this.redoutOverlay = document.getElementById('hud-redout-overlay');
    this.stallWarning = document.getElementById('hud-stall-warning');
    this.spinWarning = document.getElementById('hud-spin-warning');

    // Cache Takeoff elements
    this.gearVal = document.getElementById('hud-gear-val');
    this.flapsVal = document.getElementById('hud-flaps-val');
    this.brakesWarning = document.getElementById('hud-brakes-warning');
    this.scrapeWarning = document.getElementById('hud-scrape-warning');
    this.crashWarning = document.getElementById('hud-crash-warning');

    // Cache ignition/exhaust warnings
    this.engineWarning = document.getElementById('hud-engine-warning');
    this.airbrakesWarning = document.getElementById('hud-airbrakes-warning');
    this.abWarning = document.getElementById('hud-ab-warning');

    this.generateProceduralPitchLadder();

    // Initialize decoupled HUD components
    this.fpvComponent = new FlightPathVector();
    this.fpvComponent.init();

    this.ilsComponent = new ILSIndicator();
    this.ilsComponent.init();
  }

  generateProceduralPitchLadder() {
    if (!this.pitchLadder) return;
    this.pitchLadder.innerHTML = ''; 

        for (let pitch = -90; pitch <= 90; pitch += 10) {
          const line = document.createElement('div');
          line.className = `pitch-line pitch-${pitch}`;

          if (pitch === 0) {
            line.classList.add('horizon');
          } else if (pitch > 0) {
            line.classList.add('positive');
          } else {
            line.classList.add('negative');
          }

          const verticalOffsetPx = -pitch * 5;
          line.style.top = `calc(50% + ${verticalOffsetPx}px)`;

          const labelLeft = document.createElement('span');
          labelLeft.textContent = Math.abs(pitch);
          const labelRight = document.createElement('span');
          labelRight.textContent = Math.abs(pitch);

          line.appendChild(labelLeft);
          line.appendChild(labelRight);
          this.pitchLadder.appendChild(line);
        }
      }

      update(deltaTime) {
        if (!this.engine || !this.engine.moduleManager) return;

        if (!this.aircraftManager) {
          this.aircraftManager = this.engine.moduleManager.get('Aircraft');
        }
        if (!this.cameraManager) {
          this.cameraManager = this.engine.moduleManager.get('Camera');
        }

        if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

        const aircraft = this.aircraftManager.activeAircraft;

        // Convert units to standard aviation units using Indicated Airspeed (IAS)
        const speedKnots = Math.round(aircraft.indicatedAirspeed * 1.94384);
        const altitudeFeet = Math.round(aircraft.altitude * 3.28084);
        const vsFPM = Math.round(aircraft.verticalSpeed * 196.85); 
        const throttlePercent = Math.round(aircraft.controls.throttle * 100);

        // Format heading as standard 3-digit string (e.g. 045°)
        let headingString = String(aircraft.heading);
        while (headingString.length < 3) {
          headingString = '0' + headingString;
        }
        headingString = headingString + '°';

        // Populate readouts
        if (this.speedVal) this.speedVal.textContent = speedKnots;
        if (this.altitudeVal) this.altitudeVal.textContent = altitudeFeet;
        if (this.headingVal) this.headingVal.textContent = headingString;
        if (this.throttleVal) this.throttleVal.textContent = `${throttlePercent}%`;
        if (this.rpmVal) this.rpmVal.textContent = aircraft.rpm;
        
        if (this.vsVal) {
          const sign = vsFPM >= 0 ? '+' : '';
          this.vsVal.textContent = `${sign}${vsFPM} FPM`;
          this.vsVal.style.color = vsFPM < -800 ? '#ff5555' : '#00ff66';
        }

        // Update Throttle Progress Bar
        if (this.throttleBar) {
          this.throttleBar.style.width = `${Math.min(throttlePercent, 100)}%`;
          
          // Make throttle bar turn orange/red inside afterburner detent (>100% AB throttle)
          if (aircraft.afterburnerActive) {
            this.throttleBar.style.backgroundColor = '#ff4500';
            this.throttleBar.style.boxShadow = '0 0 8px #ff4500';
          } else {
            this.throttleBar.style.backgroundColor = '#00ff66';
            this.throttleBar.style.boxShadow = '0 0 6px #00ff66';
          }
        }

        // Update Artificial Horizon / Pitch Ladder (Inverted pitch sign bug corrected)
        if (this.pitchLadder && this.cameraManager && this.cameraManager.cameraQuat) {
          const cameraEuler = new THREE.Euler().setFromQuaternion(this.cameraManager.cameraQuat, 'YXZ');
          
          const cameraPitchDeg = cameraEuler.x * (180 / Math.PI);
          const cameraRollDeg = cameraEuler.z * (180 / Math.PI);

          // Pitch-up Euler angles are negative in Three.js. Multiplying by negative moves the ladder DOWN correctly.
          const pitchOffsetPx = -cameraPitchDeg * 5; 
          
          this.pitchLadder.style.transform = `translateY(${pitchOffsetPx}px) rotate(${-cameraRollDeg}deg)`;
        }

        // Update top Heading tape tick displacement
        if (this.headingTape) {
          const tapeOffsetPx = -aircraft.heading * 2; 
          this.headingTape.style.transform = `translateX(${tapeOffsetPx}px)`;
        }

        // Advanced Systems Telemetry HUD integration
        if (this.fuelVal) {
          this.fuelVal.textContent = `${Math.round(aircraft.fuel)} kg`;
          this.fuelVal.style.color = aircraft.fuel < (aircraft.config.maxFuelCapacity * 0.15) ? '#ff5555' : '#00ff66';
        }

        if (this.gForceVal) {
          this.gForceVal.textContent = `${aircraft.gForce.toFixed(1)} G`;
          this.gForceVal.style.color = (aircraft.gForce > 5.0 || aircraft.gForce < 0.2) ? '#ffea00' : '#00ff66';
        }

        // Physiological Vision Overlays Opacities
        if (this.blackoutOverlay) {
          this.blackoutOverlay.style.opacity = aircraft.blackout;
        }
        if (this.redoutOverlay) {
          this.redoutOverlay.style.opacity = aircraft.redout;
        }

        // Stall, Spin, and Crash Warnings Displays
        if (this.stallWarning) {
          if (aircraft.isStalled && !aircraft.isSpinning && !aircraft.isCrashed) {
            this.stallWarning.classList.remove('hidden');
          } else {
            this.stallWarning.classList.add('hidden');
          }
        }

        if (this.spinWarning) {
          if (aircraft.isSpinning && !aircraft.isCrashed) {
            this.spinWarning.classList.remove('hidden');
          } else {
            this.spinWarning.classList.add('hidden');
          }
        }

        // Takeoff / Landing configurations displays
        if (this.gearVal) {
          this.gearVal.textContent = aircraft.gearRetracted ? 'UP' : 'DN';
          this.gearVal.style.color = aircraft.gearRetracted ? '#ffaa00' : '#00ff66'; 
        }

        if (this.flapsVal) {
          const stages = ['0% CLEAN', '50% TO', '100% LDG'];
          this.flapsVal.textContent = stages[aircraft.flapsStage];
          this.flapsVal.style.color = aircraft.flapsStage > 0 ? '#ffea00' : '#00ff66';
        }

        if (this.brakesWarning) {
          if (aircraft.controls.brakes && !aircraft.isCrashed) {
            this.brakesWarning.classList.remove('hidden');
          } else {
            this.brakesWarning.classList.add('hidden');
          }
        }

        if (this.scrapeWarning) {
          if (aircraft.isBellyScraping && !aircraft.isCrashed) {
            this.scrapeWarning.classList.remove('hidden');
          } else {
            this.scrapeWarning.classList.add('hidden');
          }
        }

        if (this.crashWarning) {
          if (aircraft.isCrashed) {
            this.crashWarning.classList.remove('hidden');
          } else {
            this.crashWarning.classList.add('hidden');
          }
        }

        // Engine Ignition & Airbrake overlays updates
        if (this.engineWarning) {
          if (!aircraft.engineOn && !aircraft.isCrashed) {
            this.engineWarning.classList.remove('hidden');
          } else {
            this.engineWarning.classList.add('hidden');
          }
        }

        if (this.airbrakesWarning) {
          if (aircraft.airbrakesActive && !aircraft.isCrashed) {
            this.airbrakesWarning.classList.remove('hidden');
          } else {
            this.airbrakesWarning.classList.add('hidden');
          }
        }

        if (this.abWarning) {
          if (aircraft.afterburnerActive && !aircraft.isCrashed) {
            this.abWarning.classList.remove('hidden');
          } else {
            this.abWarning.classList.add('hidden');
          }
        }

        // Update modular sub-components
        if (this.fpvComponent) {
          this.fpvComponent.update(aircraft, this.engine.camera);
        }
        if (this.ilsComponent) {
          this.ilsComponent.update(aircraft);
        }
      }
    }