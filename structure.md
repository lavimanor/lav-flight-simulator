# Project Structure

This repository is an Electron-based desktop flight simulator built with HTML, CSS, JavaScript, and Three.js. The codebase is organized into a small set of entry files, a main game runtime under src, and supporting asset generation scripts.

## Root Files

- main.js - Electron main process that creates the app window and launches the simulator.
- preload.js - Preload script that exposes safe APIs to the renderer process.
- package.json - Project metadata, dependencies, and the start script.
- README.md - Setup instructions, controls, and project overview.
- structure.md - High-level repository map.
- scripts/ - Build-time and runtime helper scripts.
  - scripts/sound-builder.js - Generates procedural sound assets if missing.

## Source Tree

- src/index.html - Main HTML entry point for the app shell.
- src/css/main.css - Global styles for the simulator UI.
- src/js/app.js - Application bootstrap logic.

### Aircraft and Rendering

- src/js/aircraft/
  - AircraftBase.js - Shared aircraft behavior and state.
  - AircraftConfig.js - Aircraft configuration data.
  - AircraftMeshBuilder.js - Builds aircraft meshes for rendering.

### Core Engine

- src/js/core/
  - Engine.js - Main update loop and runtime coordination.
  - ModuleManager.js - Loads and manages modular systems.

### Game Systems and Managers

- src/js/modules/
  - AircraftManager.js - Aircraft lifecycle and selection.
  - CameraManager.js - Camera movement and view switching.
  - EnvironmentManager.js - World and scene environment setup.
  - HudManager.js - HUD orchestration.
  - InputManager.js - Keyboard and input handling.
  - MainMenuManager.js - Main menu flow.
  - MenuManager.js - In-game menu UI handling.
  - SoundManager.js - Audio playback and mixing.
  - TerrainManager.js - Terrain generation and rendering.
  - WaterManager.js - Water surface effects.
  - WeatherManager.js - Atmospheric and weather simulation.
  - hud/ - HUD-specific components such as flight path and ILS indicators.
  - ui/ - UI-related modules like settings menus.

### Physics and Simulation

- src/js/physics/
  - Aerodynamics.js - Lift and drag calculations.
  - Atmosphere.js - Atmospheric conditions and density.
  - BrakeSolver.js - Brake and wheel friction logic.
  - DragSolver.js - Drag force modeling.
  - FlightPhysicsSolver.js - Core flight simulation controller.
  - LiftSolver.js - Lift force modeling.
  - PropulsionSolver.js - Engine thrust and power calculations.

### Utilities

- src/js/utils/
  - Noise.js - Procedural noise helpers for terrain and effects.

## Assets

- src/assets/model/ - 3D model assets for aircraft and scenery.
- src/assets/sound/ - Audio assets, including engine and environmental sounds.
- src/assets/sound/engine/ - Generated engine sound files.

## Architecture Notes

- The simulator is split into modular managers so gameplay systems can be developed and maintained independently.
- Physics logic is isolated from rendering and UI concerns to keep the simulation easier to extend.
- Procedural sound generation is handled automatically at runtime when required assets are missing.
