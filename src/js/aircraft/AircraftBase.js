import * as THREE from 'three';
import { AircraftMeshBuilder } from './AircraftMeshBuilder.js';
import { FlightPhysicsSolver } from '../physics/FlightPhysicsSolver.js';

export class AircraftBase {
  constructor(config) {
    this.config = config;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.angularVelocity = new THREE.Vector3();
    this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
    this.quaternion = new THREE.Quaternion();
    this.controls = {
      pitch: 0,
      roll: 0,
      yaw: 0,
      throttle: 0,
      brakes: false 
    };
    this.airspeed = 0.0;
    this.indicatedAirspeed = 0.0;
    this.groundSpeed = 0.0;
    this.altitude = 0;
    this.heading = 0;
    this.verticalSpeed = 0;
    this.rpm = 0;
    this.brakePressure = 0.0;
    this.airbrakeDeployState = 0.0;
    this.sinkRate = 0.0;
    this.fuel = this.config.maxFuelCapacity;
    this.gForce = 1.0;
    this.blackout = 0.0;
    this.redout = 0.0;
    this.isStalled = false;
    this.isSpinning = false;
    this.isCrashed = false;
    this.isSinking = false;
    this.spinDir = 1;
    this.gearRetracted = false;
    this.flapsStage = 0;
    this.isBellyScraping = false;
    this.engineOn = true;
    this.engineSpool = 1.0;
    this.airbrakesActive = false;
    this.afterburnerActive = false;
    this.propellerGroup = null;
    this.gearGroup = null;
    this.afterburnerGroup = null;
    AircraftMeshBuilder.build(this);
  }
  spawn(scene, position) {
    this.position.copy(position);
    this.group.position.copy(position);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.airspeed = 0.0;
    this.indicatedAirspeed = 0.0;
    this.groundSpeed = 0.0;
    this.sinkRate = 0.0;
    this.rotation.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
    this.quaternion.set(0, 0, 0, 1);
    this.group.quaternion.set(0, 0, 0, 1);
    this.fuel = this.config.maxFuelCapacity;
    this.gForce = 1.0;
    this.blackout = 0.0;
    this.redout = 0.0;
    this.isStalled = false;
    this.isSpinning = false;
    this.isCrashed = false;
    this.isSinking = false;
    this.isBellyScraping = false;
    this.brakePressure = 0.0;
    this.airbrakeDeployState = 0.0;
    this.gearRetracted = false;
    this.flapsStage = 0;
    this.controls.brakes = false;
    this.engineOn = true;
    this.engineSpool = 1.0;
    this.airbrakesActive = false;
    this.afterburnerActive = false;
    this.controls.throttle = 0.0;
    if (this.gearGroup) this.gearGroup.visible = true;
    if (this.afterburnerGroup) this.afterburnerGroup.visible = false;
    scene.add(this.group);
  }
  update(deltaTime) {
    if (this.engineOn && this.fuel > 0) {
      this.engineSpool = THREE.MathUtils.lerp(this.engineSpool, 1.0, 1.8 * deltaTime);
    } else {
      this.engineSpool = THREE.MathUtils.lerp(this.engineSpool, 0.0, 2.5 * deltaTime);
    }
    const rpmScaling = (this.controls.throttle * 75 + 5) * this.engineSpool + (this.airspeed * 0.4 * (1.0 - this.engineSpool));
    if (this.propellerGroup) {
      this.propellerGroup.rotation.z += rpmScaling * deltaTime;
    }
    if (this.cargoPropellers) {
      this.cargoPropellers.forEach((prop) => {
        prop.rotation.z += rpmScaling * deltaTime;
      });
    }
    if (this.gearGroup) {
      this.gearGroup.visible = !this.gearRetracted;
    }
    if (this.afterburnerGroup) {
      this.afterburnerGroup.visible = this.afterburnerActive && (this.engineSpool > 0.8) && (this.fuel > 0);
    }
    FlightPhysicsSolver.solve(this, deltaTime);
  }
}