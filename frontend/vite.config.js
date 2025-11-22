// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,           // Auto-open browser
    host: true,           // Allow access from network (optional)
  },
  preview: {
    port: 5173,
    open: true,
  },
});