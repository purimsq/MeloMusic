// Centralized Cloud API Endpoint Resolver for MUSE Desktop PC
export const VERCEL_PRODUCTION_URL = 'https://melo-music-azure.vercel.app';

export function resolveApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // When running packaged inside Electron or from local file protocol:
  // Route all /api requests to the live Vercel production backend!
  if (typeof window !== 'undefined') {
    const isElectron = window.electronAPI?.isElectron || !!window.navigator?.userAgent?.includes?.('Electron');
    const isPackaged = isElectron && window.location.protocol === 'file:';
    const isExternal = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    // If running in packaged desktop app or outside dev server, use full Vercel URL
    if (isPackaged || isExternal || !window.location.port) {
      return `${VERCEL_PRODUCTION_URL}${cleanPath}`;
    }
  }

  // When running locally under Vite dev server (where Vite proxy is active), relative path works
  return cleanPath;
}
