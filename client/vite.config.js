import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://passtheaux.onrender.com',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'https://passtheaux.onrender.com',
        ws: true,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
