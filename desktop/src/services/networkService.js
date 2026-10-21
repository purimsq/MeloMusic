// Real Internet Connectivity Monitor for MUSE Desktop
// Distinguishes between connected to WiFi with no data vs real functioning Internet connection

class NetworkService {
  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.listeners = [];
    this.checkInterval = null;

    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  init() {
    window.addEventListener('online', () => this.verifyConnection());
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notify();
    });

    // Initial check
    this.verifyConnection();

    // Periodic check every 20 seconds to catch silent internet drops
    this.checkInterval = setInterval(() => {
      this.verifyConnection();
    }, 20000);
  }

  async verifyConnection() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (this.isOnline) {
        this.isOnline = false;
        this.notify();
      }
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Ping lightweight Google generate_204 endpoint with timestamp to bypass caches
      await fetch(`https://www.google.com/generate_204?t=${Date.now()}`, {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!this.isOnline) {
        this.isOnline = true;
        this.notify();
      }
      return true;
    } catch {
      // Primary ping failed; try backup Cloudflare trace
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 3000);
        await fetch(`https://cloudflare.com/cdn-cgi/trace?t=${Date.now()}`, {
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller2.signal
        });
        clearTimeout(timeoutId2);

        if (!this.isOnline) {
          this.isOnline = true;
          this.notify();
        }
        return true;
      } catch {
        // Actual internet is down despite being connected to local WiFi router
        if (this.isOnline) {
          this.isOnline = false;
          this.notify();
        }
        return false;
      }
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback({ isOnline: this.isOnline });
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb({ isOnline: this.isOnline });
      } catch (err) {
        console.error('Error notifying network listener:', err);
      }
    });
  }
}

export const networkService = new NetworkService();
