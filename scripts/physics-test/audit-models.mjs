// Headless audit of the procedural aircraft models: builds each one in Node
// and compares the visual bounding box against the physics config (span,
// length, gear rest height). Mismatches show up as wheels buried in the
// runway or wingtip crashes triggering far from the visible wingtip.
//
//   node scripts/physics-test/audit-models.mjs

import * as THREE from 'three';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { AircraftMeshBuilder } from '../../src/js/aircraft/AircraftMeshBuilder.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const configDir = join(root, 'src', 'data', 'aircraft');
const configs = readdirSync(configDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(configDir, f), 'utf8')));

for (const config of configs) {
  const aircraft = { config, group: new THREE.Group() };
  AircraftMeshBuilder.build(aircraft);
  aircraft.group.updateMatrixWorld(true);

  const bbox = new THREE.Box3().setFromObject(aircraft.group);
  const size = bbox.getSize(new THREE.Vector3());
  const gco = config.groundClearanceOffset ?? 1.2;

  const gearBottom = bbox.min.y; // should be ~= -gco so the wheels kiss the runway
  const spanErr = size.x - config.dimensions.span;
  const lenErr = size.z - config.dimensions.length;

  // Body bottom without the gear: this is what belly landings rest on, so it
  // should match config bellyClearance (default 0.35).
  aircraft.gearGroup.removeFromParent();
  aircraft.group.updateMatrixWorld(true);
  const bodyBbox = new THREE.Box3().setFromObject(aircraft.group);
  const bellyBottom = bodyBbox.min.y;
  const belly = config.bellyClearance ?? 0.35;

  console.log(
    `${config.id.padEnd(8)} span ${size.x.toFixed(1).padStart(5)} (cfg ${config.dimensions.span}) ` +
    `len ${size.z.toFixed(1).padStart(5)} (cfg ${config.dimensions.length}) ` +
    `gearBottom ${gearBottom.toFixed(2).padStart(6)} (want ${(-gco).toFixed(2)}) ` +
    `bellyBottom ${bellyBottom.toFixed(2).padStart(6)} (want ${(-belly).toFixed(2)}) ` +
    `gearParts ${aircraft.gearGroup.children.length}` +
    `${Math.abs(gearBottom + gco) > 0.25 ? '  <-- GEAR MISMATCH' : ''}` +
    `${Math.abs(bellyBottom + belly) > 0.30 ? '  <-- BELLY MISMATCH' : ''}` +
    `${Math.abs(spanErr) > config.dimensions.span * 0.25 ? '  <-- SPAN MISMATCH' : ''}` +
    `${Math.abs(lenErr) > config.dimensions.length * 0.25 ? '  <-- LENGTH MISMATCH' : ''}`
  );
}
