import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { normalizePath } from 'vite';
import path from 'node:path';
import fs from 'node:fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyKaotoCamelCatalog()],
  build: {
    outDir: './dist/webapp',
    sourcemap: true,
    emptyOutDir: true,
  },
  base: './',
});

/**
 * Temporary function to copy the built Kaoto Camel Catalog into the assets folder
 *
 * When dynamically importing the Camel Catalog is supported, this function can be removed
 * and this file can be restored to a .ts file.
 * Related issue: https://github.com/sveltejs/vite-plugin-svelte/issues/141#issuecomment-898900239
 */
function copyKaotoCamelCatalog() {
  let camelCatalogPath = '';

  try {
    // eslint-disable-next-line no-undef
    camelCatalogPath = normalizePath(path.dirname(require.resolve('@kaoto-next/camel-catalog')));
  } catch (error) {
    /* empty */
  }

  console.info(`Copying '@kaoto-next/camel-catalog' from ${camelCatalogPath}`);

  try {
    if (fs.readdirSync(camelCatalogPath).length === 0) {
      throw new Error();
    }
  } catch (error) {
    const message = [
      `The '${camelCatalogPath}' folder is empty.`,
      'No files found in the Camel Catalog directory.',
      'Please run `yarn workspace @kaoto-next/camel-catalog run build`',
      'or `yarn build` in the `@kaoto-next/camel-catalog` package',
    ];

    throw new Error(message.join('\n\n'));
  }

  return viteStaticCopy({
    targets: [
      {
        src: camelCatalogPath,
        dest: '.',
        rename: 'camel-catalog',
      },
    ],
  });
}
