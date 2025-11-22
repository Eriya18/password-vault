// extension/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest })
  ],
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',        // Your popup.html
        // Add more entry points if needed:
        // options: 'options.html',
        // background: 'src/background.js',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5174,        // Different port to avoid conflict
    open: false,
  },
});