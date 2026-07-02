import * as THREE from 'three';
import { AircraftMeshBuilder } from './AircraftMeshBuilder.js';
import { FlightPhysicsSolver } from '../physics/FlightPhysicsSolver.js';

export class AircraftBase {
  constructor(config) {
    this.config = config;
    this.group = new THREE.Group();

    // Flight state coordinates
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();        // World velocity vector (m/s)
    this.angularVelocity = new THREE.Vector3(); // Local angular velocity (rad/s)
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();

    // Normalized control surfaces
    this.controls = {
      pitch: 0,
      roll: 0,
      yaw: 0,
      throttle: 0,
      brakes: false 
    };

    // Telemetry registers
    this.airspeed = 0.0;          // True Airspeed (TAS) in m/s
    this.indicatedAirspeed = 0.0; // Indicated Airspeed (IAS) in m/s
    this.groundSpeed = 0.0;       // Ground Speed (GS) in m/s
    this.altitude = 0;       
    this.heading = 0;        
    this.verticalSpeed = 0;  
    this.rpm = 0;

    // Actuator deployment states
    this.brakePressure = 0.0;
    this.airbrakeDeployState = 0.0;
    this.sinkRate = 0.0;

    // Advanced Systems state registers
    this.fuel = this.config.maxFuelCapacity; 
    this.gForce = 1.0;                       
    this.blackout = 0.0;                     
    this.redout = 0.0;                       
    this.isStalled = false;                  
    this.isSpinning = false;                 
    this.isCrashed = false;                  // Crash state register
    this.isSinking = false;                  // Water splashdown sinking animation register
    this.spinDir = 1;                        

    // Takeoff/Landing gear & flaps registers
    this.gearRetracted = false;              
    this.flapsStage = 0;                     
    this.isBellyScraping = false;            

    // Engine ignition & Airbrakes registers
    this.engineOn = true;                    // Spawns ignited by default to prevent user takeoff confusion!
    this.engineSpool = 1.0;                  // 1.0 Spooled and ready on spawn
    this.airbrakesActive = false;            
    this.afterburnerActive = false;          

    this.propellerGroup = null;
    this.gearGroup = null;                   
    this.afterburnerGroup = null;            

    // Build the procedural 3D representation via the dedicated builder
    AircraftMeshBuilder.build(this);
  }

  spawn(scene, position) {
    this.position.copy(position);
    this.group.position.copy(position);
    
    // Complete rigid-body flight state wipe
    this.velocity.set(0, 0, 0); 
    this.angularVelocity.set(0, 0, 0);
    this.airspeed = 0.0; // Reset airspeed momentum completely
    this.indicatedAirspeed = 0.0;
    this.groundSpeed = 0.0;
    this.sinkRate = 0.0;

    // Reset heading rotation back to point straight down the runway (positive Z track)
    this.rotation.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.quaternion.set(0, 0, 0, 1);
    this.group.quaternion.set(0, 0, 0, 1);

    // Reset advanced physical registers
    this.fuel = this.config.maxFuelCapacity; 
    this.gForce = 1.0;
    this.blackout = 0.0;
    this.redout = 0.0;
    this.isStalled = false;
    this.isSpinning = false;
    this.isCrashed = false; // Reset crash flag completely
    this.isSinking = false; // Reset water sinking state completely
    this.isBellyScraping = false;
    this.brakePressure = 0.0;
    this.airbrakeDeployState = 0.0;

    // Reset takeoff configurations
    this.gearRetracted = false;
    this.flapsStage = 0;
    this.controls.brakes = false;

    // Reset engine starter & exhaust
    this.engineOn = true; // Auto ignited on spawn
    this.engineSpool = 1.0;
    this.airbrakesActive = false;
    this.afterburnerActive = false;
    this.controls.throttle = 0.0;

    if (this.gearGroup) this.gearGroup.visible = true; 
    if (this.afterburnerGroup) this.afterburnerGroup.visible = false; 
    
    scene.add(this.group);
  }

  update(deltaTime) {
    // 1. Spool engine ignition RPM state
    if (this.engineOn && this.fuel > 0) {
      this.engineSpool = THREE.MathUtils.lerp(this.engineSpool, 1.0, 1.8 * deltaTime); 
    } else {
      this.engineSpool = THREE.MathUtils.lerp(this.engineSpool, 0.0, 2.5 * deltaTime); 
    }

    // 2. Animate propeller rotations (Trainer aircraft only)
    const rpmScaling = (this.controls.throttle * 75 + 5) * this.engineSpool + (this.airspeed * 0.4 * (1.0 - this.engineSpool));
    if (this.propellerGroup) {
      this.propellerGroup.rotation.z += rpmScaling * deltaTime;
    }
    if (this.cargoPropellers) {
      this.cargoPropellers.forEach((prop) => {
        prop.rotation.z += rpmScaling * deltaTime;
      });
    }

    // 3. Align visual landing gear group visibility to retraction state
    if (this.gearGroup) {
      this.gearGroup.visible = !this.gearRetracted;
    }

    // 4. Toggle visual Afterburner exhaust flames (Fighter aircraft only)
    if (this.afterburnerGroup) {
      this.afterburnerGroup.visible = this.afterburnerActive && (this.engineSpool > 0.8) && (this.fuel > 0);
    }

    // 5. Solve rigid body dynamics and advanced physics kinematics synchronously
    FlightPhysicsSolver.solve(this, deltaTime);
  }
}