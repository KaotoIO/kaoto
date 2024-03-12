// @ts-check
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { getCamelCatalogFiles } from './scripts/get-camel-catalog-files';
import { getLastCommitInfo } from './scripts/get-last-commit-info';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const lastCommitInfo = await getLastCommitInfo();

  return {
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
    define: {
      __GIT_HASH: JSON.stringify(lastCommitInfo.hash),
      __GIT_DATE: JSON.stringify(lastCommitInfo.date),
      __KAOTO_VERSION: JSON.stringify(packageJson.version),
    },
    build: {
      outDir: './dist',
      sourcemap: true,
      emptyOutDir: true,
    },
    base: './',
  };
});
