export const AircraftConfig = {
  trainer: {
    id: 'trainer',
    name: 'T-1 Basic Trainer',
    description: 'A standard single-engine civilian propeller aircraft. Highly stable, forgiving, and ideal for introductory flight practice.',
    mass: 1100,
    wingArea: 15.0,
    aspectRatio: 7.5,
    maxThrust: 6800,
    rollRate: 1.5,
    pitchRate: 1.0,
    yawRate: 0.5,
    dragCoefficientZero: 0.035,
    liftCoefficientMax: 1.4,
    emptyWeight: 800,
    maxFuelCapacity: 120,
    dimensions: {
      span: 11.0,
      length: 8.2,
      height: 2.4
    },
    modelPath: null // Null triggers backward-compatible procedural fallback
  },
  fighter: {
    id: 'fighter',
    name: 'F-18 Strike Fighter',
    description: 'A twin-engine, multirole military supersonic jet. Capable of extreme roll speeds, climbs, and tactical air maneuvering.',
    mass: 9500,
    wingArea: 38.0,
    aspectRatio: 3.5,
    maxThrust: 115000,
    rollRate: 3.0,
    pitchRate: 1.8,
    yawRate: 0.8,
    dragCoefficientZero: 0.018,
    liftCoefficientMax: 1.8,
    emptyWeight: 8000,
    maxFuelCapacity: 4000,
    dimensions: {
      span: 11.4,
      length: 17.1,
      height: 4.7
    },
    modelPath: null // Null triggers backward-compatible procedural fallback
  }
};

/**
 * Registers an aircraft configuration at runtime.
 * @param {Object|string} jsonConfig - JSON string or parsed Object.
 */
export function registerAircraftConfig(jsonConfig) {
  const config = typeof jsonConfig === 'string' ? JSON.parse(jsonConfig) : jsonConfig;
  if (!config.id) {
    throw new Error("Dynamic aircraft registration failed: Missing 'id' parameter.");
  }
  AircraftConfig[config.id] = config;
  return config;
}