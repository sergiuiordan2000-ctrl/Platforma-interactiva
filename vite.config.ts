import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import {collectThirdPartyLicenses, renderThirdPartyLicenses} from './scripts/third-party-licenses.mjs';

// Notele de licență ale codului terț inclus în frontend (registrul §34.9; propunerea „corectura notelor de
// licență” r2, D-L1 = A): dist/THIRD_PARTY_LICENSES.txt, din modulele efectiv incluse în bundle; construcția
// eșuează dacă un pachet nu are text de licență sau are o licență neacceptată.
function thirdPartyLicenses(): Plugin {
  return {
    name: 'civic-third-party-licenses',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files: string[] = [];
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'chunk') files.push(...Object.keys(chunk.modules));
      }
      const entries = collectThirdPartyLicenses(files);
      this.emitFile({
        type: 'asset',
        fileName: 'THIRD_PARTY_LICENSES.txt',
        source: renderThirdPartyLicenses(entries, {title: 'Turnu Măgurele Civic — frontend (dist/): licențele codului terț inclus'}),
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), thirdPartyLicenses()],
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
