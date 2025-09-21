// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',              // onde está o index.html
  build: {
    outDir: '../dist',         // saída vai para /dist na raiz
    emptyOutDir: true
  },
  preview: {
    port: parseInt(process.env.PORT || '4173'),
    host: true
  }
});
