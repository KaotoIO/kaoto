import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { getCamelCatalogFiles } from './scripts/get-camel-catalog-files';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: getCamelCatalogFiles(),
          dest: 'camel-catalog',
          transform: (content, filename) => {
            return JSON.stringify(JSON.parse(content));
          },
        },
      ],
    }),
  ],
  build: {
    outDir: './dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  base: './',
});
