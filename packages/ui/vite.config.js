import react from '@vitejs/plugin-react';
import circleDependency from 'vite-plugin-circular-dependency';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    circleDependency({
      outputFilePath: './circleDep',
    }),
  ],
  build: {
    outDir: './dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  base: './',
});
