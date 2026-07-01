const { contextBridge, ipcRenderer } = require('electron');

// Exposes safe APIs to the frontend, prepared for future hardware (Micro:bit) and network inputs
contextBridge.exposeInMainWorld('electronAPI', {
  receiveHardwareData: (callback) => ipcRenderer.on('hardware-data', callback)
});