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
import { SoundManager } from './modules/SoundManager.js';
import { SettingsMenu } from './modules/ui/SettingsMenu.js';
import { DebugManager } from './modules/ui/DebugManager.js';

document.addEventListener('DOMContentLoaded', () => {
  try {
    const engine = new Engine();
    const moduleManager = new ModuleManager(engine);
    engine.moduleManager = moduleManager;
    
    const environmentManager = new EnvironmentManager();
    moduleManager.register('Environment', environmentManager);
    
    const weatherManager = new WeatherManager();
    moduleManager.register('Weather', weatherManager);
    
    const inputManager = new InputManager();
    moduleManager.register('Input', inputManager);
    
    const aircraftManager = new AircraftManager();
    moduleManager.register('Aircraft', aircraftManager);
    
    const terrainManager = new TerrainManager();
    moduleManager.register('Terrain', terrainManager);
    
    const cameraManager = new CameraManager();
    moduleManager.register('Camera', cameraManager);
    
    const hudManager = new HudManager();
    moduleManager.register('HUD', hudManager);
    
    const menuManager = new MenuManager();
    moduleManager.register('Menu', menuManager);
    
    const mainMenuManager = new MainMenuManager();
    moduleManager.register('MainMenu', mainMenuManager);
    
    const waterManager = new WaterManager();
    moduleManager.register('Water', waterManager);
    
    const soundManager = new SoundManager();
    moduleManager.register('Sound', soundManager);
    
    const settingsMenu = new SettingsMenu();
    moduleManager.register('Settings', settingsMenu);

    const debugManager = new DebugManager();
    moduleManager.register('Debug', debugManager);

    moduleManager.initAll();
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