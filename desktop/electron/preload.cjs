const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.send('app:check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('app:download-update'),
  quitAndInstall: () => ipcRenderer.send('app:quit-and-install'),
  openExternal: (url) => ipcRenderer.send('app:open-external', url),
  onCheckingForUpdate: (callback) => {
    ipcRenderer.on('app:checking-for-update', (_event) => {
      if (typeof callback === 'function') callback();
    });
  },
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('app:update-available', (_event, info) => {
      if (typeof callback === 'function') callback(info);
    });
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('app:update-not-available', (_event, info) => {
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
  onUpdateError: (callback) => {
    ipcRenderer.on('app:update-error', (_event, err) => {
      if (typeof callback === 'function') callback(err);
    });
  },
  setTitleBarOverlay: (options) => {
    ipcRenderer.send('window:set-titlebar-overlay', options);
  },
  fetchInnerTube: (endpoint, payload) => ipcRenderer.invoke('yt:innertube', { endpoint, payload })
});
