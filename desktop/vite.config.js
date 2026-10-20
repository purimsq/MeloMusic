import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api': {
        target: 'https://melo-music-azure.vercel.app',
        changeOrigin: true,
        secure: false
      },
      '/yt-music': {
        target: 'https://music.youtube.com/youtubei/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yt-music/, ''),
        headers: {
          'Origin': 'https://music.youtube.com',
          'Referer': 'https://music.youtube.com'
        }
      },
      '/yt-web': {
        target: 'https://www.youtube.com/youtubei/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yt-web/, ''),
        headers: {
          'Origin': 'https://www.youtube.com',
          'Referer': 'https://www.youtube.com'
        }
      }
    }
  }
});
