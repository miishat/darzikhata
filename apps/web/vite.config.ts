import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // The service worker is irrelevant in unit tests, so it is only added for real builds.
    mode !== 'test' &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'DarziKhata (ডেমো)',
          short_name: 'DarziKhata',
          description: 'দর্জির মাপ, অর্ডার আর হিসাব এক জায়গায়',
          lang: 'bn',
          start_url: '/',
          display: 'standalone',
          theme_color: '#0f766e',
          background_color: '#f8faf9',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
        },
      }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright's end-to-end tests in e2e/ run in a real browser, not here.
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
