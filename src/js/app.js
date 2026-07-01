import { Engine } from './core/Engine.js';
import { ModuleManager } from './core/ModuleManager.js';
import { EnvironmentManager } from './modules/EnvironmentManager.js';
import { AircraftManager } from './modules/AircraftManager.js';
import { CameraManager } from './modules/CameraManager.js';
import { InputManager } from './modules/InputManager.js';
import { HudManager } from './modules/HudManager.js';
import { MenuManager } from './modules/MenuManager.js';
import { MainMenuManager } from './modules/MainMenuManager.js';
import { WaterManager } from './modules/WaterManager.js';
import { TerrainManager } from './modules/TerrainManager.js';
import { WeatherManager } from './modules/WeatherManager.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    // 1. Initialize the Three.js Engine container
    const engine = new Engine();

    // 2. Initialize the extensible Module system
    const moduleManager = new ModuleManager(engine);
    
    // Link ModuleManager to Engine to allow cross-module resolving
    engine.moduleManager = moduleManager;

    // 3. Register the Environment Module (Scene backdrop)
    const environmentManager = new EnvironmentManager();
    moduleManager.register('Environment', environmentManager);

    // 4. Register the Weather Module (Atmosphere, Wind, and Rain particles)
    const weatherManager = new WeatherManager();
    moduleManager.register('Weather', weatherManager);

    // 5. Register the Input Manager Module (Aviation stick binds)
    const inputManager = new InputManager();
    moduleManager.register('Input', inputManager);

    // 6. Register the Aircraft Manager Module (Flight Dynamics)
    const aircraftManager = new AircraftManager();
    moduleManager.register('Aircraft', aircraftManager);

    // 7. Register the Procedural Terrain Module (Mountains, valleys)
    const terrainManager = new TerrainManager();
    moduleManager.register('Terrain', terrainManager);

    // 8. Register the Camera Manager Module (Smooth tracking lag)
    const cameraManager = new CameraManager();
    moduleManager.register('Camera', cameraManager);

    // 9. Register the Head-Up Display (HUD) Manager Module (Project flight stats)
    const hudManager = new HudManager();
    moduleManager.register('HUD', hudManager);

    // 10. Register the Hangar Selection Menu Module
    const menuManager = new MenuManager();
    moduleManager.register('Menu', menuManager);

    // 11. Register the Pre-Flight Main Menu Manager
    const mainMenuManager = new MainMenuManager();
    moduleManager.register('MainMenu', mainMenuManager);

    // 12. Register the Procedural Water Simulation Module
    const waterManager = new WaterManager();
    moduleManager.register('Water', waterManager);

    // Initialize all modules sequentially
    moduleManager.initAll();

    // 13. Start the global simulation rendering ticking loop
    engine.start();

  } catch (error) {
    console.error("Initialization failure during startup setup:", error);
    const overlay = document.getElementById('hud-overlay');
    if (overlay) {
      overlay.innerHTML = `<div style="background: rgba(20,0,0,0.85); color: #ff5555; padding: 20px; border: 2px solid red; margin: 30px; border-radius: 8px;">` +
                          `<h2>Simulator Weather Load Failure</h2>` +
                          `<p>${error.message}</p></div>`;
    }
  }
});