const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  receiveHardwareData: (callback) => ipcRenderer.on('hardware-data', callback),
  readAircraftDirectory: () => ipcRenderer.invoke('read-aircraft-directory')
});