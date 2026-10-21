const { app, BrowserWindow, shell, ipcMain, session, nativeImage } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Ensure Chromium permits media playback without blocking on initial user gesture
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let mainWindow = null;
let localServer = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function startLocalServer(distDir) {
  return new Promise((resolve) => {
    if (localServer) {
      const port = localServer.address().port;
      return resolve(port);
    }
    localServer = http.createServer((req, res) => {
      let reqPath = (req.url || '/').split('?')[0];
      if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
      const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
      let filePath = path.join(distDir, safePath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });

    localServer.listen(0, 'localhost', () => {
      const port = localServer.address().port;
      resolve(port);
    });
  });
}

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
    // In production build, serve dist via local loopback server so YouTube Iframe API has a valid origin and autoplay permissions
    startLocalServer(path.join(__dirname, '../dist')).then((port) => {
      if (mainWindow) {
        mainWindow.loadURL(`http://localhost:${port}`);
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (localServer) {
      try {
        localServer.close();
      } catch {}
      localServer = null;
    }
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

// Direct YouTube Music InnerTube query handler in Node.js process (zero CORS, works standalone in packaged .exe)
ipcMain.handle('yt:innertube', async (_event, { endpoint, payload }) => {
  try {
    const cleanEndpoint = String(endpoint || '').replace(/^\/+/, '');
    const url = `https://music.youtube.com/youtubei/v1/${cleanEndpoint}?prettyPrint=false`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      return { error: `HTTP ${response.status}`, status: response.status };
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`[Electron Main] InnerTube error on ${endpoint}:`, err);
    return { error: err.message };
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
