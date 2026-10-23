// @ts-check
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/

export default defineConfig(async () => {
  const outDir = './dist';

  return {
    plugins: [react()],
    build: {
      outDir,
      sourcemap: true,
      emptyOutDir: true,
    },
    base: './',
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
        },
      },
    },
    resolve: {
      alias: [
        {
          find: /^~.+/,
          replacement: (val) => {
            return val.replace(/^~/, '');
          },
        },
      ],
    },
  };
});
