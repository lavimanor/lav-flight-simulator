// Headless flight-physics regression tests.
// Runs the REAL solver (src/js/physics) in Node against every aircraft config.
//
//   node scripts/physics-test/run-tests.mjs
//
// Guards the invariants that have bitten this project before:
//   - aircraft spawn at rest on the runway and do NOT start crashed
//   - every type can take off and climb
//   - the body-frame sign conventions (+X = PORT) stay un-mirrored
//   - the G-limiter keeps load factor near the configured airframe limit
//   - non-FBW types stall and recover; FBW jets refuse to stall

import * as THREE from 'three';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FlightPhysicsSolver } from '../../src/js/physics/FlightPhysicsSolver.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const configDir = join(root, 'src', 'data', 'aircraft');
const configs = readdirSync(configDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(configDir, f), 'utf8')));

const AIRFIELD_Y = 180.0;
let failures = 0;

function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.log(`  FAIL  ${label}  ${detail}`);
  }
}

function makeAircraft(config) {
  return {
    config,
    group: new THREE.Group(),
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    angularVelocity: new THREE.Vector3(),
    rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
    quaternion: new THREE.Quaternion(),
    controls: { pitch: 0, roll: 0, yaw: 0, throttle: 0, brakes: false },
    airspeed: 0, indicatedAirspeed: 0, groundSpeed: 0, altitude: 0, heading: 0,
    verticalSpeed: 0, rpm: 0, brakePressure: 0, airbrakeDeployState: 0, sinkRate: 0,
    fuel: config.maxFuelCapacity, gForce: 1, blackout: 0, redout: 0,
    isStalled: false, isSpinning: false, isCrashed: false, isSinking: false, spinDir: 1,
    gearRetracted: false, flapsStage: 0, isBellyScraping: false,
    engineOn: true, engineSpool: 1, airbrakesActive: false, afterburnerActive: false,
  };
}

function spawnOnRunway(a) {
  const y = AIRFIELD_Y + (a.config.groundClearanceOffset ?? 1.2);
  a.position.set(0, y, -500);
  a.group.position.copy(a.position);
}

function spawnInAir(a, altitude, speed) {
  a.position.set(0, altitude, 0);
  a.group.position.copy(a.position);
  a.velocity.set(0, 0, speed);
  a.airspeed = speed;
  a.gearRetracted = true;
}

// Steps the sim; onFrame may mutate controls each frame. Returns elapsed seconds.
function run(a, seconds, onFrame = null, dt = 1 / 60) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    if (onFrame) onFrame(a, i * dt);
    FlightPhysicsSolver.solve(a, dt);
    if (a.isCrashed) return i * dt;
  }
  return seconds;
}

// --- 1. Spawn at rest: nobody starts crashed ------------------------------
console.log('\n[1] Spawn-at-rest (10 s idle on the runway)');
for (const config of configs) {
  const a = makeAircraft(config);
  spawnOnRunway(a);
  const restY = AIRFIELD_Y + (config.groundClearanceOffset ?? 1.2);
  run(a, 10);
  check(
    `${config.id}: rests on gear, not crashed`,
    !a.isCrashed && !a.isSinking && Math.abs(a.position.y - restY) < 0.2 && a.groundSpeed < 0.5,
    `crashed=${a.isCrashed} sinking=${a.isSinking} y=${a.position.y.toFixed(2)} (rest ${restY.toFixed(2)}) gs=${a.groundSpeed.toFixed(2)}`
  );
}

// --- 2. Takeoff and climb ---------------------------------------------------
console.log('\n[2] Takeoff: full throttle, rotate above stall, climb 150 m');
for (const config of configs) {
  const a = makeAircraft(config);
  spawnOnRunway(a);
  const startY = a.position.y;
  let maxAGL = 0;
  run(a, 150, (ac) => {
    ac.controls.throttle = 1.0;
    const agl = ac.position.y - startY;
    maxAGL = Math.max(maxAGL, agl);
    if (agl > 20) {
      ac.gearRetracted = true;
      ac.flapsStage = 0;
    } else if (config.id === 'cargo') {
      ac.flapsStage = 1; // heavy turboprop uses takeoff flaps
    }
    // A minimal pilot: keep the wings level and hold a ~9 deg climb attitude
    // after rotation instead of hauling the stick back forever.
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(ac.group.quaternion);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(ac.group.quaternion);
    ac.controls.roll = THREE.MathUtils.clamp(up.x * 2.0, -1, 1); // banked left (+x up) -> roll right
    const rotate = (ac.stallSpeedTAS ?? 999) * 1.05;
    if (ac.airspeed < rotate && agl < 5) {
      ac.controls.pitch = 0.0;
    } else {
      const pitchNow = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1));
      ac.controls.pitch = THREE.MathUtils.clamp((0.16 - pitchNow) * 4.0, -0.5, 0.7);
    }
  });
  check(
    `${config.id}: climbed (max +${maxAGL.toFixed(0)} m)`,
    !a.isCrashed && maxAGL > 150,
    `crashed=${a.isCrashed} maxAGL=${maxAGL.toFixed(1)} speed=${a.airspeed.toFixed(1)}`
  );
}

// --- 3. Frame convention: right-roll command tips the PORT (+X) wing up ----
console.log('\n[3] Sign conventions (memory: +X is PORT; regression for mirrored controls)');
{
  const a = makeAircraft(configs.find((c) => c.id === 'f16'));
  spawnInAir(a, 2000, 150);
  a.controls.throttle = 0.6;
  run(a, 0.8, (ac) => { ac.controls.roll = 0.35; }); // short, partial input: must not roll past vertical
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(a.group.quaternion);
  check('f16: roll-right command banks right (up.x < 0)', up.x < -0.05, `up.x=${up.x.toFixed(3)}`);

  const b = makeAircraft(configs.find((c) => c.id === 'f16'));
  spawnInAir(b, 2000, 150);
  b.controls.throttle = 0.6;
  run(b, 4.0, (ac) => { ac.controls.yaw = 1.0; });
  check('f16: yaw-right command turns heading right (0<hdg<180)', b.heading > 2 && b.heading < 180, `heading=${b.heading}`);
}

// --- 4. G-limiter -----------------------------------------------------------
console.log('\n[4] G-limiter: full aft stick at high speed stays near the airframe limit');
for (const id of ['f16', 'trainer']) {
  const config = configs.find((c) => c.id === id);
  const a = makeAircraft(config);
  spawnInAir(a, 3000, id === 'trainer' ? 55 : 250);
  a.controls.throttle = 1.0;
  let maxG = 0;
  run(a, 6, (ac) => {
    ac.controls.pitch = 1.0;
    maxG = Math.max(maxG, ac.gForce);
  });
  const gLimit = config.pitchGScale ?? 6;
  check(
    `${id}: max G ${maxG.toFixed(1)} vs limit ${gLimit}`,
    maxG < gLimit + 1.2 && maxG > gLimit * 0.5,
    `maxG=${maxG.toFixed(2)}`
  );
}

// --- 5. Stall and recovery (non-FBW) / stall refusal (FBW) ------------------
console.log('\n[5] Stall behavior');
{
  const a = makeAircraft(configs.find((c) => c.id === 'trainer'));
  spawnInAir(a, 1500, 35);
  let stalled = false;
  run(a, 30, (ac) => {
    ac.controls.throttle = 0.15;
    ac.controls.pitch = 1.0;
    if (ac.isStalled) stalled = true;
  });
  check('trainer: hauling back at idle stalls the wing', stalled, `stalled=${stalled}`);

  if (stalled && !a.isCrashed) {
    let recovered = false;
    run(a, 15, (ac) => {
      ac.controls.pitch = -0.4;
      ac.controls.roll = 0;
      ac.controls.yaw = 0;
      ac.controls.throttle = 0.8;
      if (!ac.isStalled && !ac.isSpinning) recovered = true;
    });
    check('trainer: nose-down recovers from the stall', recovered && !a.isCrashed, `crashed=${a.isCrashed}`);
  }

  const f = makeAircraft(configs.find((c) => c.id === 'f22'));
  spawnInAir(f, 3000, 180);
  f.controls.throttle = 1.0;
  let fbwStalled = false;
  run(f, 20, (ac) => {
    ac.controls.pitch = 1.0;
    if (ac.isStalled) fbwStalled = true;
  });
  check('f22: FBW AoA limiter prevents the stall', !fbwStalled && !f.isCrashed, `stalled=${fbwStalled} crashed=${f.isCrashed}`);
}

// --- 6. Hands-off cruise stability ------------------------------------------
console.log('\n[6] Hands-off stability (60 s, no input, must not diverge or crash)');
for (const id of ['trainer', 'f16', 'cargo']) {
  const config = configs.find((c) => c.id === id);
  const a = makeAircraft(config);
  spawnInAir(a, 3000, id === 'trainer' ? 45 : 140);
  a.controls.throttle = id === 'trainer' ? 0.85 : 0.5;
  let minG = 99, maxG = -99;
  run(a, 60, (ac) => {
    minG = Math.min(minG, ac.gForce);
    maxG = Math.max(maxG, ac.gForce);
  });
  check(
    `${id}: stays flying (G ${minG.toFixed(1)}..${maxG.toFixed(1)}, alt ${a.position.y.toFixed(0)} m)`,
    !a.isCrashed && !a.isSinking && a.position.y > 500 && minG > -1.5 && maxG < 4.0,
    `crashed=${a.isCrashed} alt=${a.position.y.toFixed(0)} G=[${minG.toFixed(2)},${maxG.toFixed(2)}]`
  );
}

// --- 7. Gentle landing does not crash ---------------------------------------
console.log('\n[7] Touchdown tolerance: a 2 m/s sink landing is safe');
{
  const config = configs.find((c) => c.id === 'trainer');
  const a = makeAircraft(config);
  a.position.set(0, AIRFIELD_Y + 30, -1200);
  a.group.position.copy(a.position);
  a.velocity.set(0, -2.0, 30);
  a.airspeed = 30;
  a.gearRetracted = false;
  a.controls.throttle = 0.0;
  let touched = false;
  run(a, 30, (ac) => {
    ac.controls.pitch = 0.15; // slight flare hold
    if (ac.groundSpeed > 0 && ac.position.y < AIRFIELD_Y + 2) touched = true;
    ac.controls.brakes = touched;
  });
  check('trainer: gentle touchdown rolls out safely', touched && !a.isCrashed, `touched=${touched} crashed=${a.isCrashed} gs=${a.groundSpeed.toFixed(1)}`);
}

console.log(failures === 0 ? '\nAll physics tests passed.' : `\n${failures} TEST(S) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
