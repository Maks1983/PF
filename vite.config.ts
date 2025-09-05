import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DB_HOST': JSON.stringify(process.env.VITE_DB_HOST),
    'import.meta.env.VITE_DB_PORT': JSON.stringify(process.env.VITE_DB_PORT),
    'import.meta.env.VITE_DB_NAME': JSON.stringify(process.env.VITE_DB_NAME),
    'import.meta.env.VITE_DB_USER': JSON.stringify(process.env.VITE_DB_USER),
    'import.meta.env.VITE_DB_PASSWORD': JSON.stringify(process.env.VITE_DB_PASSWORD),
    'import.meta.env.VITE_DB_CONNECTION_LIMIT': JSON.stringify(process.env.VITE_DB_CONNECTION_LIMIT),
    'import.meta.env.VITE_DB_ACQUIRE_TIMEOUT': JSON.stringify(process.env.VITE_DB_ACQUIRE_TIMEOUT),
    'import.meta.env.VITE_DB_TIMEOUT': JSON.stringify(process.env.VITE_DB_TIMEOUT),
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
