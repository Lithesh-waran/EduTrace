import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Preview hosts are supplied per process (never committed): the cloud preview
// hostname changes between VM sessions.
const additionalAllowedHosts = (process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    allowedHosts: ['localhost', '127.0.0.1', ...additionalAllowedHosts],
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
});
