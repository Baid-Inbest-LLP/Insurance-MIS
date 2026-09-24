import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5176,
    // Must match the server's FRONTEND_URL (CORS origin), so fail instead of drifting to 5177.
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      },
    },
  },
});
