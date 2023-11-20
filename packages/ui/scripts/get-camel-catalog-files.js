import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { normalizePath } from 'vite';

const require = createRequire(import.meta.url);
/**
 * Temporary function to copy the built Kaoto Camel Catalog into the assets folder
 *
 * When dynamically importing the Camel Catalog is supported, this function can be removed
 * and this file can be restored to a .ts file.
 * Related issue: https://github.com/sveltejs/vite-plugin-svelte/issues/141#issuecomment-898900239
 */
export const getCamelCatalogFiles = () => {
  let camelCatalogPath = '';

  try {
    const camelCatalogIndexJsonPath = require.resolve('@kaoto-next/camel-catalog/index.json');
    camelCatalogPath = normalizePath(dirname(camelCatalogIndexJsonPath));
  } catch (error) {
    throw new Error(`Could not find '@kaoto-next/camel-catalog' \n\n ${error}`);
  }

  console.info(`Found '@kaoto-next/camel-catalog' in ${camelCatalogPath}`, '\n');

  try {
    if (readdirSync(camelCatalogPath).length === 0) {
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

  /** List all the JSON files in the Camel Catalog folder */
  const jsonFiles = readdirSync(camelCatalogPath)
    .filter((file) => file.endsWith('.json'))
    .map((file) => join(camelCatalogPath, file));

  return jsonFiles;
};
