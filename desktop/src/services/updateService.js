// Update Service for Melo Desktop
// Handles automatic background checks (once per session on launch),
// communicates with Electron's autoUpdater if running in desktop shell,
// and polls public GitHub Releases API as a seamless fallback.

const CURRENT_VERSION = '1.0.3';
const GITHUB_REPO = 'purimsq/MeloMusic';
const SESSION_CHECK_KEY = 'melo_desktop_update_checked_session';

class UpdateService {
  constructor() {
    this.currentVersion = CURRENT_VERSION;
    this.status = 'idle'; // 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'ready'
    this.latestVersion = null;
    this.releaseNotes = '';
    this.downloadProgress = 0;
    this.hasUpdate = false;
    this.downloadUrl = null;
    this.htmlUrl = null;
    this.resetStatusTimeout = null;
    this.listeners = new Set();

    // Query running app version from Electron if available
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
      window.electronAPI.getAppVersion().then((ver) => {
        if (ver) {
          this.currentVersion = String(ver).replace(/^v/, '').trim();
          this.notify();
        }
      }).catch(() => {});
    }

    // Listen for Electron autoUpdater IPC if running inside Electron wrapper
    if (typeof window !== 'undefined' && window.electronAPI) {
      if (typeof window.electronAPI.onCheckingForUpdate === 'function') {
        window.electronAPI.onCheckingForUpdate(() => {
          this.status = 'checking';
          this.notify();
        });
      }
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
      if (typeof window.electronAPI.onUpdateError === 'function') {
        window.electronAPI.onUpdateError((err) => {
          console.warn('[UpdateService] autoUpdater note:', err);
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
      progress: this.downloadProgress,
      downloadUrl: this.downloadUrl,
      htmlUrl: this.htmlUrl
    };
  }

  setUpdateAvailable(version, notes = '', downloadUrl = null) {
    this.hasUpdate = true;
    this.status = 'available';
    this.latestVersion = String(version).replace(/^v/, '').trim();
    this.releaseNotes = notes;
    if (downloadUrl) this.downloadUrl = downloadUrl;
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
   * Check for updates via public GitHub Releases API and Electron IPC.
   * Ensures a brief, visible loading delay (~1.1s) for clear visual feedback.
   */
  async checkForUpdates(isUserInitiated = false) {
    if (this.status === 'checking' || this.status === 'downloading') {
      return this.hasUpdate;
    }

    if (this.resetStatusTimeout) {
      clearTimeout(this.resetStatusTimeout);
      this.resetStatusTimeout = null;
    }

    this.status = 'checking';
    this.notify();

    // Ensure user sees the loading state for at least ~1100ms
    const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 1100));

    let foundNewer = false;
    let remoteVer = null;
    let releaseBody = '';
    let downloadUrl = null;
    let htmlUrl = `https://github.com/${GITHUB_REPO}/releases/latest`;

    // 1. Check public GitHub Releases API
    const checkGitHub = async () => {
      try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { Accept: 'application/vnd.github.v3+json' },
          cache: 'no-cache'
        });

        if (res.ok) {
          const data = await res.json();
          const rawTag = data.tag_name || data.name || '';
          const cleanTag = String(rawTag).replace(/^v/, '').trim();
          htmlUrl = data.html_url || htmlUrl;

          const exeAsset = Array.isArray(data.assets)
            ? data.assets.find((a) => a.name && a.name.toLowerCase().endsWith('.exe'))
            : null;
          downloadUrl = exeAsset ? exeAsset.browser_download_url : htmlUrl;

          if (cleanTag && this.isNewer(cleanTag, this.currentVersion)) {
            foundNewer = true;
            remoteVer = cleanTag;
            releaseBody = data.body || '';
          }
        }
      } catch (err) {
        if (isUserInitiated) console.warn('[UpdateService] GitHub check error:', err);
      }
    };

    // 2. Electron IPC check if available
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
      try {
        window.electronAPI.checkForUpdates();
      } catch (e) {
        console.warn('[UpdateService] Electron autoUpdater check error:', e);
      }
    }

    // Await both GitHub API fetch and minimum visual delay
    await Promise.allSettled([checkGitHub(), minDelayPromise]);

    if (foundNewer && remoteVer) {
      this.downloadUrl = downloadUrl;
      this.htmlUrl = htmlUrl;
      this.setUpdateAvailable(remoteVer, releaseBody, downloadUrl);
      return true;
    } else {
      // App is up to date (or network gracefully handled)
      this.hasUpdate = false;
      this.status = 'up-to-date';
      this.notify();

      this.resetStatusTimeout = setTimeout(() => {
        if (this.status === 'up-to-date') {
          this.status = 'idle';
          this.notify();
        }
      }, 2500);

      return false;
    }
  }

  /**
   * Compare semver strings (e.g. '1.0.1' > '1.0.0')
   */
  isNewer(remote, current) {
    if (!remote || !current) return false;
    const cleanR = String(remote).replace(/^v/, '').trim();
    const cleanC = String(current).replace(/^v/, '').trim();
    const rParts = cleanR.split('.').map((p) => parseInt(p, 10) || 0);
    const cParts = cleanC.split('.').map((p) => parseInt(p, 10) || 0);
    const maxLen = Math.max(rParts.length, cParts.length);
    for (let i = 0; i < maxLen; i++) {
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
        try {
          this.status = 'downloading';
          this.notify();
          window.electronAPI.downloadUpdate();
          return;
        } catch (e) {
          console.warn('Electron downloadUpdate error:', e);
        }
      }
      const targetUrl = this.downloadUrl || this.htmlUrl || `https://github.com/${GITHUB_REPO}/releases/latest`;
      if (typeof window.electronAPI.openExternal === 'function') {
        window.electronAPI.openExternal(targetUrl);
        return;
      }
    }

    // Direct browser opening fallback
    const targetUrl = this.downloadUrl || this.htmlUrl || `https://github.com/${GITHUB_REPO}/releases/latest`;
    if (typeof window !== 'undefined') {
      window.open(targetUrl, '_blank');
    }
  }
}

export const updateService = new UpdateService();
