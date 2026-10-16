// Centralized Cloud API Endpoint Resolver for MUSE Web & Android Native App
export const VERCEL_PRODUCTION_URL = 'https://melo-music-azure.vercel.app';

export function resolveApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // When running inside Android Capacitor Native App (or any mobile WebView):
  // Since there is no local Node.js server inside the phone,
  // route all /api/ requests directly to the live Vercel production server!
  if (typeof window !== 'undefined') {
    const isCapacitor = window.Capacitor?.isNativePlatform?.() || window.Capacitor !== undefined;
    const isLocalMobile = window.location.protocol === 'file:' || window.location.hostname === 'localhost';

    if (isCapacitor || (isLocalMobile && window.location.port !== '5173')) {
      return `${VERCEL_PRODUCTION_URL}${cleanPath}`;
    }
  }

  // When running locally on Vite dev server (port 5173) or hosted directly on Vercel, use relative path
  return cleanPath;
}
