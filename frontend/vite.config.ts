import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

// Vite evaluates this config as an ES module.  `__dirname` only happens to be
// available with its bundled config loader, so derive it explicitly instead.
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'MediKiosk+ Patient Case-Taking Software',
          short_name: 'MediKiosk+',
          description: 'Multilingual AI Kiosk for Patient Case-Taking & Triage (PS 26047)',
          theme_color: '#4f46e5',
          background_color: '#fafafa',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': rootDir,
      },
    },
    server: {
      host: true,
      port: 5173,
    },
  };
});
