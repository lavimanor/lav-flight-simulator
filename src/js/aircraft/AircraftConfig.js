export const AircraftConfig = {
  trainer: {
    id: 'trainer',
    name: 'T-1 Basic Trainer',
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
    }
  },
  fighter: {
    id: 'fighter',
    name: 'F-18 Strike Fighter',
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
    }
  },
  stunt: {
    id: 'stunt',
    name: 'S-2 Acrobatic Stunt',
    mass: 750,
    wingArea: 11.5,
    aspectRatio: 5.2,
    maxThrust: 5200,
    rollRate: 4.5,   // Hyper agile roll authority
    pitchRate: 2.2,  // Rapid responsive pitch loops
    yawRate: 1.2,
    dragCoefficientZero: 0.042, // High profile drag biplane
    liftCoefficientMax: 1.35,
    emptyWeight: 550,
    maxFuelCapacity: 80,
    dimensions: {
      span: 6.2,
      length: 5.8,
      height: 2.1
    }
  },
  cargo: {
    id: 'cargo',
    name: 'C-130 Heavy Cargo',
    mass: 34000, // Massive four-prop lifter
    wingArea: 162.0,
    aspectRatio: 10.1,
    maxThrust: 180000,
    rollRate: 0.5,   // Sluggish roll speed
    pitchRate: 0.45, // Heavy pitch control
    yawRate: 0.25,
    dragCoefficientZero: 0.026,
    liftCoefficientMax: 1.9,
    emptyWeight: 22000,
    maxFuelCapacity: 15000,
    dimensions: {
      span: 40.4,
      length: 29.8,
      height: 11.6
    }
  }
};