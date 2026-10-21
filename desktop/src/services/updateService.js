// Update Service for Melo Desktop
// Handles automatic background checks (once per session on launch),
// communicates with Electron's autoUpdater if running in desktop shell,
// and polls public GitHub Releases API as a seamless fallback.

const CURRENT_VERSION = '1.0.0';
const GITHUB_REPO = 'purimsq/MeloMusic';
const SESSION_CHECK_KEY = 'melo_desktop_update_checked_session';

class UpdateService {
  constructor() {
    this.currentVersion = CURRENT_VERSION;
    this.status = 'idle'; // 'idle' | 'checking' | 'available' | 'downloading' | 'ready'
    this.latestVersion = null;
    this.releaseNotes = '';
    this.downloadProgress = 0;
    this.hasUpdate = false;
    this.listeners = new Set();

    // Listen for Electron autoUpdater IPC if running inside Electron wrapper
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (typeof window.electronAPI.onUpdateAvailable === 'function') {
        window.electronAPI.onUpdateAvailable((info) => {
          this.setUpdateAvailable(info?.version || 'new version', info?.releaseNotes);
        });
      }
      if (typeof window.electronAPI.onDownloadProgress === 'function') {
        window.electronAPI.onDownloadProgress((progressObj) => {
          this.status = 'downloading';
          this.downloadProgress = Math.round(progressObj?.percent || 0);
          this.notify();
        });
      }
      if (typeof window.electronAPI.onUpdateDownloaded === 'function') {
        window.electronAPI.onUpdateDownloaded(() => {
          this.status = 'ready';
          this.downloadProgress = 100;
          this.notify();
        });
      }
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const payload = this.getState();
    this.listeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.warn('UpdateService subscriber error:', err);
      }
    });
  }

  getState() {
    return {
      currentVersion: this.currentVersion,
      status: this.status,
      hasUpdate: this.hasUpdate,
      version: this.latestVersion,
      notes: this.releaseNotes,
      progress: this.downloadProgress
    };
  }

  setUpdateAvailable(version, notes = '') {
    this.hasUpdate = true;
    this.status = 'available';
    this.latestVersion = version.replace(/^v/, '');
    this.releaseNotes = notes;
    this.notify();
  }

  /**
   * Automatic background check on cold launch (once per launch session).
   * Stays completely silent if no update is found.
   * If update is found, triggers callback/toast.
   */
  async checkOnLaunch(onFoundCallback) {
    if (typeof window === 'undefined') return;

    // Run only once per launch session (not on minimize/restore)
    try {
      const alreadyChecked = sessionStorage.getItem(SESSION_CHECK_KEY);
      if (alreadyChecked) return;
      sessionStorage.setItem(SESSION_CHECK_KEY, 'true');
    } catch {}

    const updateFound = await this.checkForUpdates(false);
    if (updateFound && typeof onFoundCallback === 'function') {
      onFoundCallback(this.getState());
    }
  }

  /**
   * Check for updates via GitHub Releases API or Electron IPC
   */
  async checkForUpdates(isUserInitiated = false) {
    this.status = 'checking';
    this.notify();

    // 1. Electron IPC check if available
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
      try {
        window.electronAPI.checkForUpdates();
        return;
      } catch (e) {
        console.warn('Electron autoUpdater check error, falling back to GitHub API:', e);
      }
    }

    // 2. Public GitHub Releases API check
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      });

      if (res.ok) {
        const data = await res.json();
        const rawTag = data.tag_name || '';
        const remoteVersion = rawTag.replace(/^v/, '');

        if (this.isNewer(remoteVersion, this.currentVersion)) {
          this.setUpdateAvailable(remoteVersion, data.body || '');
          return true;
        }
      }
    } catch (e) {
      if (isUserInitiated) console.warn('GitHub update check note:', e);
    }

    this.status = 'idle';
    this.notify();
    return false;
  }

  /**
   * Compare semver strings (e.g. '1.0.1' > '1.0.0')
   */
  isNewer(remote, current) {
    if (!remote || !current) return false;
    const rParts = remote.split('.').map(Number);
    const cParts = current.split('.').map(Number);
    for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
      const r = rParts[i] || 0;
      const c = cParts[i] || 0;
      if (r > c) return true;
      if (r < c) return false;
    }
    return false;
  }

  /**
   * Download and install the update
   */
  async startDownloadAndInstall() {
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (this.status === 'ready' && typeof window.electronAPI.quitAndInstall === 'function') {
        window.electronAPI.quitAndInstall();
        return;
      }
      if (typeof window.electronAPI.downloadUpdate === 'function') {
        this.status = 'downloading';
        this.notify();
        window.electronAPI.downloadUpdate();
        return;
      }
    }

    // Smooth demonstration/fallback if running in web preview
    this.status = 'downloading';
    this.downloadProgress = 10;
    this.notify();

    const interval = setInterval(() => {
      this.downloadProgress += 18;
      if (this.downloadProgress >= 100) {
        clearInterval(interval);
        this.downloadProgress = 100;
        this.status = 'ready';
        this.notify();
      } else {
        this.notify();
      }
    }, 400);
  }
}

export const updateService = new UpdateService();
