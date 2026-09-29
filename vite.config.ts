import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Faza 5.2: API-ul serverului Node, pe aceeași origine în dezvoltare (proxy)
    preview: {
      proxy: { '/api': process.env.CIVIC_API_PROXY || 'http://127.0.0.1:3001' },
    },
    server: {
      proxy: { '/api': process.env.CIVIC_API_PROXY || 'http://127.0.0.1:3001' },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
