import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        login: resolve(__dirname, 'login.html'),
        panel: resolve(__dirname, 'panel.html'),
        firmar: resolve(__dirname, 'firmar.html'),
      },
    },
  },
});
