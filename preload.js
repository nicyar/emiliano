const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig:   ()       => ipcRenderer.invoke('load-config'),
  saveConfig:   (config) => ipcRenderer.invoke('save-config', config),
  generatePDF:  (data)   => ipcRenderer.invoke('generate-pdf', data)
});
