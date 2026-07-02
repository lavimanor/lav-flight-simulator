export const AircraftConfig = {
  trainer: {
    id: 'trainer',
    name: 'T-1 Basic Trainer',
    mass: 1100, // Empty weight mass in kg
    wingArea: 15.0, // Wing area in square meters
    aspectRatio: 7.5,
    maxThrust: 6800, // Increased for satisfying runway acceleration
    rollRate: 1.5,
    pitchRate: 1.0,
    yawRate: 0.5,
    dragCoefficientZero: 0.035, // Parasite drag coefficient
    liftCoefficientMax: 1.4,
    emptyWeight: 800,
    maxFuelCapacity: 120, // Fuel mass capacity in kg
    dimensions: {
      span: 11.0,
      length: 8.2,
      height: 2.4
    }
  },
  fighter: {
    id: 'fighter',
    name: 'F-18 Strike Fighter',
    mass: 9500, // Heavy twin-engine loadout in kg
    wingArea: 38.0, // Extended military wing surface in square meters
    aspectRatio: 3.5,
    maxThrust: 115000, // Increased thrust for outstanding combat climbing performance
    rollRate: 3.0, // Extremely fast roll roll rates (rad/s)
    pitchRate: 1.8, // Agile G-pulling pitch rate (rad/s)
    yawRate: 0.8,
    dragCoefficientZero: 0.018, // Slippery aerodynamic profile
    liftCoefficientMax: 1.8,
    emptyWeight: 8000,
    maxFuelCapacity: 4000,
    dimensions: {
      span: 11.4,
      length: 17.1,
      height: 4.7
    }
  }
};