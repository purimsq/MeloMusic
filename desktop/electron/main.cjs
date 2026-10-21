const { app, BrowserWindow, shell, ipcMain, session, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;

// Enforce single instance lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Set Windows Application User Model ID for taskbar branding and notifications
if (process.platform === 'win32') {
  app.setAppUserModelId('com.purimsq.melomusic');
}

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, 'icon.ico')
    : path.join(__dirname, 'icon.png');
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#EBEBE9',
    title: 'MUSE - Hi-Fi Streaming',
    icon: !appIcon.isEmpty() ? appIcon : iconPath,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#EBEBE9',
      symbolColor: '#121212',
      height: 38
    },
    autoHideMenuBar: true,
    show: false, // Show when ready-to-show to prevent blank screen flicker
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  if (!appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
  }

  // Strip Electron identifier from User-Agent so YouTube Music and Iframe player operate without restrictions
  const defaultUA = session.defaultSession.getUserAgent();
  const cleanUA = defaultUA.replace(/Electron\/[0-9\.]+\s/, '');
  session.defaultSession.setUserAgent(cleanUA);

  // Handle external link clicks safely in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Reveal window smoothly when contents are painted
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174';
  const isDev = !app.isPackaged && !process.argv.includes('--production');

  if (isDev) {
    // In development mode, load Vite dev server
    mainWindow.loadURL(devServerUrl).catch(() => {
      // Retry once after 1s if Vite server was still warming up
      setTimeout(() => {
        mainWindow.loadURL(devServerUrl).catch((err) => {
          console.error('Failed to load dev server:', err);
        });
      }, 1000);
    });
  } else {
    // In production build, load the compiled dist index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for update checks
ipcMain.on('app:check-for-updates', (event) => {
  // If running in development or before electron-updater release config is bundled
  if (!app.isPackaged) {
    console.log('[Electron] Update check requested in dev mode');
    return;
  }

  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    console.warn('[Electron] autoUpdater error:', err);
  }
});

ipcMain.on('app:download-update', () => {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.downloadUpdate();
  } catch (err) {
    console.warn('[Electron] downloadUpdate error:', err);
  }
});

ipcMain.on('app:quit-and-install', () => {
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.quitAndInstall();
  } catch (err) {
    console.warn('[Electron] quitAndInstall error:', err);
  }
});

ipcMain.on('window:set-titlebar-overlay', (_event, options) => {
  if (mainWindow && typeof mainWindow.setTitleBarOverlay === 'function') {
    try {
      mainWindow.setTitleBarOverlay(options);
    } catch (e) {
      console.warn('Error setting titleBarOverlay:', e);
    }
  }
});

app.whenReady().then(() => {
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
