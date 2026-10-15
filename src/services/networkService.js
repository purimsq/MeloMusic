// Real Internet Connectivity Monitor (Active Ping vs Passive WiFi status)

class NetworkService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.checkInterval = null;

    this.init();
  }

  init() {
    window.addEventListener('online', () => this.verifyConnection());
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notify();
    });

    // Initial check
    this.verifyConnection();

    // Periodic check every 25 seconds
    this.checkInterval = setInterval(() => {
      this.verifyConnection();
    }, 25000);
  }

  async verifyConnection() {
    if (!navigator.onLine) {
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
    } catch (err) {
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
      } catch (err2) {
        // Actual internet is down despite being connected to local wifi/hotspot
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
    this.listeners.forEach(cb => cb({ isOnline: this.isOnline }));
  }
}

export const networkService = new NetworkService();
