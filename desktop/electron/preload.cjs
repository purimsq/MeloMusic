const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  checkForUpdates: () => ipcRenderer.send('app:check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('app:download-update'),
  quitAndInstall: () => ipcRenderer.send('app:quit-and-install'),
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('app:update-available', (_event, info) => {
      if (typeof callback === 'function') callback(info);
    });
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('app:download-progress', (_event, progress) => {
      if (typeof callback === 'function') callback(progress);
    });
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('app:update-downloaded', (_event, info) => {
      if (typeof callback === 'function') callback(info);
    });
  },
  setTitleBarOverlay: (options) => {
    ipcRenderer.send('window:set-titlebar-overlay', options);
  }
});
