const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { buildAudioAssets } = require('./scripts/sound-builder.js');

// Two-way IPC handler to dynamically scan local files
ipcMain.handle('read-aircraft-directory', async () => {
  try {
    const dirPath = path.join(__dirname, 'src/data/aircraft');
    if (!fs.existsSync(dirPath)) return [];
    
    // Scan files and filter for JSON extensions only
    const files = fs.readdirSync(dirPath);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
  } catch (error) {
    console.error('[main.js] Error reading aircraft directory:', error);
    return [];
  }
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // Necessary for local development to read scripts from node_modules directly
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  // Optional: Uncomment the line below to open Developer Tools for debugging during development
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  // Build and verify audio placeholder WAV directories on boot
  buildAudioAssets();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});