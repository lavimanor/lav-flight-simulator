import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { FlightPhysicsSolver } from '../../src/js/physics/FlightPhysicsSolver.js';
const config = JSON.parse(readFileSync('src/data/aircraft/stunt.json', 'utf8'));
const a = {
  config, group: new THREE.Group(),
  position: new THREE.Vector3(0, 180 + (config.groundClearanceOffset ?? 1.2), -500),
  velocity: new THREE.Vector3(), angularVelocity: new THREE.Vector3(),
  rotation: new THREE.Euler(0,0,0,'YXZ'), quaternion: new THREE.Quaternion(),
  controls: { pitch:0, roll:0, yaw:0, throttle:1, brakes:false },
  airspeed:0, indicatedAirspeed:0, groundSpeed:0, altitude:0, heading:0,
  verticalSpeed:0, rpm:0, brakePressure:0, airbrakeDeployState:0, sinkRate:0,
  fuel: config.maxFuelCapacity, gForce:1, blackout:0, redout:0,
  isStalled:false, isSpinning:false, isCrashed:false, isSinking:false, spinDir:1,
  gearRetracted:false, flapsStage:0, isBellyScraping:false,
  engineOn:true, engineSpool:1, airbrakesActive:false, afterburnerActive:false,
};
a.group.position.copy(a.position);
const dt = 1/60; const startY = a.position.y;
for (let i = 0; i < 150*60; i++) {
  const agl = a.position.y - startY;
  if (agl > 20) a.gearRetracted = true;
  const up = new THREE.Vector3(0,1,0).applyQuaternion(a.group.quaternion);
  const fwd = new THREE.Vector3(0,0,1).applyQuaternion(a.group.quaternion);
  a.controls.roll = THREE.MathUtils.clamp(up.x * 2.0, -1, 1);
  const rotate = (a.stallSpeedTAS ?? 999) * 1.05;
  if (a.airspeed < rotate && agl < 5) a.controls.pitch = 0;
  else {
    const pitchNow = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1));
    a.controls.pitch = THREE.MathUtils.clamp((0.16 - pitchNow) * 4.0, -0.5, 0.7);
  }
  FlightPhysicsSolver.solve(a, dt);
  if (i % 300 === 0 || a.isCrashed) {
    const terr = FlightPhysicsSolver.getTerrainHeightAt(a.position.x, a.position.z);
    console.log(`t=${(i*dt).toFixed(0)}s pos=(${a.position.x.toFixed(0)},${a.position.y.toFixed(0)},${a.position.z.toFixed(0)}) terr=${terr.toFixed(0)} spd=${a.airspeed.toFixed(0)} buffet=${(a.buffetIntensity||0).toFixed(2)} bank=${(a.rotation.z*57.3).toFixed(0)} aoa=${(a.aoaDeg||0).toFixed(1)}`);
  }
  if (a.isCrashed) { console.log('CRASHED'); break; }
}
