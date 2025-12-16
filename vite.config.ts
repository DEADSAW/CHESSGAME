import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'src/engine'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@game': resolve(__dirname, 'src/game'),
      '@worker': resolve(__dirname, 'src/worker'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@types': resolve(__dirname, 'src/types'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'chess-engine': ['./src/engine/index.ts'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 3000,
    open: true,
  },
});
