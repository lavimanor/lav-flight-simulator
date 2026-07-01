import * as THREE from 'three';

export class SoundManager {
  constructor() {
    this.engine = null;
    this.aircraftManager = null;
    this.listener = null;

    // Active sound loops
    this.trainerEngineSound = null;
    this.fighterEngineSound = null;
    this.afterburnerSound = null;
    this.windSound = null;
    this.alarmSound = null;
    this.scrapeSound = null;

    // One-shots
    this.splashSound = null;
    this.crashSound = null;
    this.gearSound = null;
    this.flapsSound = null;
    this.squealSound = null;

    // Persistent volume configuration scales [3]
    this.masterVolumeScale = 0.8;
    this.engineVolumeScale = 0.7;
    this.windVolumeScale = 0.5;
    this.effectsVolumeScale = 0.6;
    this.isMuted = false;

    // Trigger tracking registers
    this.splashTriggered = false;
    this.crashTriggered = false;
    this.audioInitialized = false;

    // State delta registers
    this.lastGearRetracted = false;
    this.lastFlapsStage = 0;
    this.lastOnGround = true;
  }

  init(engine) {
    this.engine = engine;

    // 1. Create a global Audio Listener and attach it to the camera
    this.listener = new THREE.AudioListener();
    this.engine.camera.add(this.listener);

    // 2. Initialize sound loaders
    this.loadSystemSounds();
  }

  loadSystemSounds() {
    const audioLoader = new THREE.AudioLoader();
    const assetsPath = 'assets/sound/';

    // Trainer piston engine loop
    this.trainerEngineSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'engine/trainer.wav', (buffer) => {
      this.trainerEngineSound.setBuffer(buffer);
      this.trainerEngineSound.setLoop(true);
      this.trainerEngineSound.setVolume(0.0);
    });

    // Fighter jet turbofan engine loop
    this.fighterEngineSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'engine/fighter.wav', (buffer) => {
      this.fighterEngineSound.setBuffer(buffer);
      this.fighterEngineSound.setLoop(true);
      this.fighterEngineSound.setVolume(0.0);
    });

    // Fighter jet afterburner loop
    this.afterburnerSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'engine/afterburner.wav', (buffer) => {
      this.afterburnerSound.setBuffer(buffer);
      this.afterburnerSound.setLoop(true);
      this.afterburnerSound.setVolume(0.0);
    });

    // Aerodynamic wind rush loop
    this.windSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'wind.wav', (buffer) => {
      this.windSound.setBuffer(buffer);
      this.windSound.setLoop(true);
      this.windSound.setVolume(0.0);
    });

    // Caution master alarm chime
    this.alarmSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'alarm.wav', (buffer) => {
      this.alarmSound.setBuffer(buffer);
      this.alarmSound.setLoop(true);
      this.alarmSound.setVolume(0.12);
    });

    // Fuselage grinding scrape loop
    this.scrapeSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'scrape.wav', (buffer) => {
      this.scrapeSound.setBuffer(buffer);
      this.scrapeSound.setLoop(true);
      this.scrapeSound.setVolume(0.0);
    });

    // One-shot splash down
    this.splashSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'splash.wav', (buffer) => {
      this.splashSound.setBuffer(buffer);
      this.splashSound.setVolume(0.55);
    });

    // One-shot structural crash
    this.crashSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'crash.wav', (buffer) => {
      this.crashSound.setBuffer(buffer);
      this.crashSound.setVolume(0.65);
    });

    // One-shot hydraulic gear whine
    this.gearSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'gear.wav', (buffer) => {
      this.gearSound.setBuffer(buffer);
      this.gearSound.setVolume(0.20);
    });

    // One-shot electric flaps whine
    this.flapsSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'flaps.wav', (buffer) => {
      this.flapsSound.setBuffer(buffer);
      this.flapsSound.setVolume(0.15);
    });

    // One-shot tire squeal
    this.squealSound = new THREE.Audio(this.listener);
    audioLoader.load(assetsPath + 'squeal.wav', (buffer) => {
      this.squealSound.setBuffer(buffer);
      this.squealSound.setVolume(0.30);
    });
  }

  /**
   * Initializes play states on user interaction to bypass browser Web Audio constraints.
   */
  ensureAudioPlayState(aircraft) {
    if (this.audioInitialized) return;

    if (aircraft.config.id === 'trainer' && this.trainerEngineSound && this.trainerEngineSound.buffer) {
      this.trainerEngineSound.play();
    } else if (aircraft.config.id === 'fighter') {
      if (this.fighterEngineSound && this.fighterEngineSound.buffer) this.fighterEngineSound.play();
      if (this.afterburnerSound && this.afterburnerSound.buffer) this.afterburnerSound.play();
    }

    if (this.windSound && this.windSound.buffer) {
      this.windSound.play();
    }
    if (this.scrapeSound && this.scrapeSound.buffer) {
      this.scrapeSound.play();
    }

    this.audioInitialized = true;
    console.log(`[SoundManager] Spatial Web Audio context activated.`);
  }

  update(deltaTime) {
    if (!this.engine || !this.engine.moduleManager) return;

    if (!this.aircraftManager) {
      this.aircraftManager = this.engine.moduleManager.get('Aircraft');
    }

    if (!this.aircraftManager || !this.aircraftManager.activeAircraft) return;

    const aircraft = this.aircraftManager.activeAircraft;

    // Trigger play states once the player starts the flight
    const mainMenu = this.engine.moduleManager.get('MainMenu');
    const mainMenuOpen = mainMenu ? mainMenu.isOpen : false;

    if (!mainMenuOpen) {
      this.ensureAudioPlayState(aircraft);
    }

    // Apply active master volume configuration or mute directly to the main listener [4]
    if (this.listener) {
      this.listener.setMasterVolume(this.isMuted ? 0.0 : this.masterVolumeScale);
    }

    // 1. Modulate Engine loops relative to active aircraft and RPM/Afterburner states
    if (aircraft.config.id === 'trainer') {
      // Ensure fighter loops are silent
      if (this.fighterEngineSound && this.fighterEngineSound.isPlaying) this.fighterEngineSound.stop();
      if (this.afterburnerSound && this.afterburnerSound.isPlaying) this.afterburnerSound.stop();

      if (this.trainerEngineSound && this.trainerEngineSound.buffer && !mainMenuOpen) {
        if (!this.trainerEngineSound.isPlaying) this.trainerEngineSound.play();
        const rpmRatio = THREE.MathUtils.clamp(aircraft.rpm / 2400.0, 0.01, 1.0);
        this.trainerEngineSound.setPlaybackRate(0.5 + 1.5 * rpmRatio);
        this.trainerEngineSound.setVolume(aircraft.engineSpool * (0.10 + 0.35 * aircraft.controls.throttle) * this.engineVolumeScale);
      }
    } else if (aircraft.config.id === 'fighter') {
      // Ensure trainer loop is silent
      if (this.trainerEngineSound && this.trainerEngineSound.isPlaying) this.trainerEngineSound.stop();

      if (this.fighterEngineSound && this.fighterEngineSound.buffer && !mainMenuOpen) {
        if (!this.fighterEngineSound.isPlaying) this.fighterEngineSound.play();
        const rpmRatio = THREE.MathUtils.clamp(aircraft.rpm / 14000.0, 0.01, 1.0);
        this.fighterEngineSound.setPlaybackRate(0.5 + 1.5 * rpmRatio);
        this.fighterEngineSound.setVolume(aircraft.engineSpool * (0.10 + 0.30 * aircraft.controls.throttle) * this.engineVolumeScale);
      }

      if (this.afterburnerSound && this.afterburnerSound.buffer && !mainMenuOpen) {
        if (!this.afterburnerSound.isPlaying) this.afterburnerSound.play();
        if (aircraft.afterburnerActive && aircraft.engineSpool > 0.8) {
          this.afterburnerSound.setVolume(0.45 * this.engineVolumeScale);
        } else {
          this.afterburnerSound.setVolume(0.0);
        }
      }
    }

    // 2. Modulate Aerodynamic Wind loop
    if (this.windSound && this.windSound.isPlaying) {
      const maxSpeed = aircraft.config.id === 'fighter' ? 140.0 : 50.0;
      const speedRatio = THREE.MathUtils.clamp(aircraft.airspeed / maxSpeed, 0.01, 1.0);
      const airbrakeVolumeBonus = aircraft.airbrakesActive ? 0.20 : 0.0;
      this.windSound.setVolume((speedRatio * 0.25 + airbrakeVolumeBonus) * this.windVolumeScale);
      this.windSound.setPlaybackRate(0.8 + 0.4 * speedRatio);
    }

    // 3. Play Warning Alarm if stalled
    if (aircraft.isStalled && !aircraft.isCrashed && !aircraft.isSinking && !mainMenuOpen) {
      if (this.alarmSound && !this.alarmSound.isPlaying && this.alarmSound.buffer) {
        this.alarmSound.play();
      }
      if (this.alarmSound && this.alarmSound.isPlaying) {
        this.alarmSound.setVolume(0.12 * this.effectsVolumeScale);
      }
    } else {
      if (this.alarmSound && this.alarmSound.isPlaying) {
        this.alarmSound.pause();
      }
    }

    // 4. Modulate fuselage metal grinding scrape loop
    if (this.scrapeSound && this.scrapeSound.isPlaying) {
      if (aircraft.isBellyScraping && !aircraft.isCrashed && !mainMenuOpen) {
        const speedRatio = THREE.MathUtils.clamp(aircraft.airspeed / 20.0, 0.1, 1.0);
        this.scrapeSound.setVolume(speedRatio * 0.50 * this.effectsVolumeScale);
      } else {
        this.scrapeSound.setVolume(0.0);
      }
    }

    // 5. Trigger Hydraulic Gear Whine One-Shot on retraction change
    if (aircraft.gearRetracted !== this.lastGearRetracted && !mainMenuOpen) {
      this.lastGearRetracted = aircraft.gearRetracted;
      if (this.gearSound && this.gearSound.buffer) {
        if (this.gearSound.isPlaying) this.gearSound.stop();
        this.gearSound.setVolume(0.20 * this.effectsVolumeScale);
        this.gearSound.play();
      }
    }

    // 6. Trigger Electric Flaps Motor Whine One-Shot on stage change
    if (aircraft.flapsStage !== this.lastFlapsStage && !mainMenuOpen) {
      this.lastFlapsStage = aircraft.flapsStage;
      if (this.flapsSound && this.flapsSound.buffer) {
        if (this.flapsSound.isPlaying) this.flapsSound.stop();
        this.flapsSound.setVolume(0.15 * this.effectsVolumeScale);
        this.flapsSound.play();
      }
    }

    // 7. Trigger Tire Touchdown Squeal One-Shot
    const terrainManager = this.engine.moduleManager.get('Terrain');
    const terrainHeight = terrainManager ? terrainManager.getHeightAt(aircraft.position.x, aircraft.position.z) : 180.0;
    const onGround = aircraft.position.y <= terrainHeight + 1.25;

    if (onGround && !this.lastOnGround && !aircraft.gearRetracted && aircraft.airspeed > 5.0 && !mainMenuOpen) {
      if (this.squealSound && this.squealSound.buffer) {
        if (this.squealSound.isPlaying) this.squealSound.stop();
        this.squealSound.setVolume(0.30 * this.effectsVolumeScale);
        this.squealSound.play();
      }
    }
    this.lastOnGround = onGround;

    // 8. One-shot Splash trigger
    if (aircraft.isSinking && !this.splashTriggered) {
      this.splashTriggered = true;
      if (this.splashSound && this.splashSound.buffer) {
        this.splashSound.setVolume(0.55 * this.effectsVolumeScale);
        this.splashSound.play();
      }
      if (this.trainerEngineSound && this.trainerEngineSound.isPlaying) this.trainerEngineSound.stop();
      if (this.fighterEngineSound && this.fighterEngineSound.isPlaying) this.fighterEngineSound.stop();
      if (this.afterburnerSound && this.afterburnerSound.isPlaying) this.afterburnerSound.stop();
      if (this.windSound && this.windSound.isPlaying) this.windSound.stop();
      if (this.alarmSound && this.alarmSound.isPlaying) this.alarmSound.stop();
      if (this.scrapeSound && this.scrapeSound.isPlaying) this.scrapeSound.stop();
    }

    // 9. One-shot Crash trigger
    if (aircraft.isCrashed && !this.crashTriggered) {
      this.crashTriggered = true;
      if (this.crashSound && this.crashSound.buffer) {
        this.crashSound.setVolume(0.65 * this.effectsVolumeScale);
        this.crashSound.play();
      }
      if (this.trainerEngineSound && this.trainerEngineSound.isPlaying) this.trainerEngineSound.stop();
      if (this.fighterEngineSound && this.fighterEngineSound.isPlaying) this.fighterEngineSound.stop();
      if (this.afterburnerSound && this.afterburnerSound.isPlaying) this.afterburnerSound.stop();
      if (this.windSound && this.windSound.isPlaying) this.windSound.stop();
      if (this.alarmSound && this.alarmSound.isPlaying) this.alarmSound.stop();
      if (this.scrapeSound && this.scrapeSound.isPlaying) this.scrapeSound.stop();
    }

    // Reset one-shot states on respawn
    if (!aircraft.isCrashed && !aircraft.isSinking && !mainMenuOpen) {
      if (this.crashTriggered || this.splashTriggered) {
        this.crashTriggered = false;
        this.splashTriggered = false;
        
        // Re-ignite background engine hum and wind loops
        this.audioInitialized = false;
        this.ensureAudioPlayState(aircraft);
      }
    }
  }
}