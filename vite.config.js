import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        panel: resolve(__dirname, 'panel.html'),
        firmar: resolve(__dirname, 'firmar.html'),
        verificar: resolve(__dirname, 'verificar.html'),
        historial: resolve(__dirname, 'historial.html'),
      },
    },
  },
});
