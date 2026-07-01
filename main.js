const { app, BrowserWindow } = require('electron');
const path = require('path');
const { buildAudioAssets } = require('./scripts/sound-builder.js');

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