import { Noise } from './Noise.js';

// Single source of truth for the terrain heightfield. The visual terrain
// (TerrainManager) and the physics ground probes (FlightPhysicsSolver) sample
// the same surface by delegating here, so they can never drift apart.
const noise = new Noise(12345);
const SCALE = 0.00015;
const MAX_ELEVATION = 700;

export function getTerrainHeightAt(worldX, worldZ) {
  const x = worldX * SCALE;
  const z = worldZ * SCALE;

  // Rolling base terrain (the original heightfield).
  const base = Math.pow(noise.fbm2D(x, z, 4), 1.4);

  // Mountain belts: a ridged fractal masked to broad bands, so distinct ranges
  // with sharp crests rise out of the rolling base instead of uniform lumps.
  // The belts fade out near the airfield so the traffic pattern and climb-out
  // corridor stay over plains (slow types can't outclimb an 800 m wall).
  const dx = Math.max(Math.abs(worldX) - 600, 0);
  const dz = Math.max(worldZ - 2500, -1500 - worldZ, 0);
  const airfieldDist = Math.hypot(dx, dz);
  const beltFade = Math.min(Math.max((airfieldDist - 3000) / 8000, 0.0), 1.0);

  const belt = noise.fbm2D(x * 0.35 + 53.1, z * 0.35 + 27.7, 2);
  let m = Math.min(Math.max((belt - 0.50) / 0.20, 0.0), 1.0);
  m = m * m * (3 - 2 * m) * beltFade;
  let ridge = 0.0;
  if (m > 0.0) {
    const ridgeSrc = noise.fbm2D(x * 1.7 + 11.3, z * 1.7 + 71.9, 3);
    ridge = Math.pow(1.0 - Math.abs(ridgeSrc * 2.0 - 1.0), 2.0);
  }

  // Fine relief so hillsides read as broken ground rather than glass.
  const detail = (noise.fbm2D(x * 9.0 + 5.5, z * 9.0 + 3.3, 2) - 0.5) * 0.05;

  let h01 = base + m * (0.18 + 0.85 * ridge - 0.45 * base);
  h01 += detail * (0.35 + h01);
  const rawHeight = h01 * MAX_ELEVATION;

  // Flat airfield plateau blended into the surrounding terrain.
  const distToCenter = Math.abs(worldX);
  if (worldZ > -1500 && worldZ < 2500) {
    const airfieldElevation = 180.0;
    if (distToCenter < 80) {
      return airfieldElevation;
    } else if (distToCenter < 600) {
      const t = (distToCenter - 80) / 520;
      const smoothT = t * t * (3 - 2 * t);
      return airfieldElevation + (rawHeight - airfieldElevation) * smoothT;
    }
  }
  return rawHeight;
}
