import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // doar.html repete o index.html com titulo e previa de compartilhamento proprios.
  build: { rollupOptions: { input: ['index.html', 'doar.html'] } },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
