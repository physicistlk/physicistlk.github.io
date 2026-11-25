import { defineConfig } from 'vite';

export default defineConfig({
  // relative base so the build works from the repository root or a sub-path
  base: './',
  build: {
    // keep the bundle out of the site's existing /assets folder
    assetsDir: 'fab-assets',
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    assetsInlineLimit: 0,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
