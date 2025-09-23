import { existsSync, readdirSync, statSync } from 'node:fs';
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
    const camelCatalogIndexJsonPath = require.resolve('@kaoto/camel-catalog/index.json');
    camelCatalogPath = normalizePath(dirname(camelCatalogIndexJsonPath));
  } catch (error) {
    throw new Error(`Could not find '@kaoto/camel-catalog' \n\n ${error}`);
  }

  console.info(`Found '@kaoto/camel-catalog' in ${camelCatalogPath}`, '\n');

  try {
    if (readdirSync(camelCatalogPath).length === 0) {
      throw new Error();
    }
  } catch (error) {
    const message = [
      `The '${camelCatalogPath}' folder is empty.`,
      'No files found in the Camel Catalog directory.',
      'Please check the dependency is installed',
      'or run `yarn add @kaoto/camel-catalog` to install it',
    ];

    throw new Error(message.join('\n\n'));
  }

  /** Recursively list all the JSON files in the Camel Catalog folder and subfolders */
  const jsonFiles = [];
  getFilesRecursively(camelCatalogPath, jsonFiles);

  return {
    basePath: camelCatalogPath,
    files: jsonFiles.filter((file) => file.endsWith('.json') || file.endsWith('.xsd')),
  };
};

function getFilesRecursively(source, files) {
  const exists = existsSync(source);
  const stats = exists && statSync(source);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    const directoryFiles = readdirSync(source);

    for (const file of directoryFiles) {
      getFilesRecursively(join(source, file), files);
    }
  } else {
    files.push(source);
  }
}
