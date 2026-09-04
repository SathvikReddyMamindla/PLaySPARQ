import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      // Browser never talks to localhost directly — the dev server proxies /api to the
      // Python backend. Supports both the sandbox preview host and local dev.
      '/api': {
        target: process.env.API_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/health': { target: process.env.API_TARGET || 'http://localhost:8000', changeOrigin: true },
    },
  },
});
