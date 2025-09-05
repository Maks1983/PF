import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Make Node.js environment variables available in the browser context
    'process.env': process.env
  },
  resolve: {
    alias: {
      // Allow importing from server directory
      '@server': resolve(__dirname, 'server')
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Include server files in the build
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  }
});