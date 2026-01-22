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
export const getCatalogFiles = () => {
  let camelCatalogPath = '';

  try {
    const camelCatalogIndexJsonPath = require.resolve('@kaoto/camel-catalog/index.json');
    camelCatalogPath = normalizePath(dirname(camelCatalogIndexJsonPath));
  } catch (error) {
    throw new Error(`Could not find '@kaoto/camel-catalog' \n\n ${error}`);
  }

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

  console.info(`Found Camel in '@kaoto/camel-catalog' using ${camelCatalogPath}`, '\n');

  /** Recursively list all the JSON and XSD files in the Camel Catalog folder and subfolders */
  const catalogFiles = [];
  getFilesRecursively(camelCatalogPath, catalogFiles);

  /** Add Citrus catalog files */
  catalogFiles.push(... getCitrusCatalogFiles());

  const basePath = normalizePath(dirname(require.resolve('@kaoto/camel-catalog')));

  return {
    basePath: basePath,
    files: catalogFiles.filter((file) => file.endsWith('.json') || file.endsWith('.xsd')),
  };
};

function getCitrusCatalogFiles() {
  let citrusCatalogPath = '';

  try {
    const citrusCatalogIndexJsonPath = require.resolve('@kaoto/camel-catalog/citrus/index.json');
    citrusCatalogPath = normalizePath(dirname(citrusCatalogIndexJsonPath));
  } catch (error) {
    console.warn(`Could not find Citrus in '@kaoto/camel-catalog' \n\n ${error}`);
    return [];
  }

  try {
    if (readdirSync(citrusCatalogPath).length === 0) {
      return [];
    }
  } catch (error) {
    const message = [
      `The '${citrusCatalogPath}' folder is empty.`,
      'No files found in the Citrus Catalog directory.',
      'Please check the dependency is installed',
      'or run `yarn add @kaoto/camel-catalog` to install it',
    ];

    console.warn(message.join('\n\n'));
  }

  console.info(`Found Citrus in '@kaoto/camel-catalog' using ${citrusCatalogPath}`, '\n');

  /** Recursively list all the JSON and XSD files in the Citrus Catalog folder and subfolders */
  const catalogFiles = [];
  getFilesRecursively(citrusCatalogPath, catalogFiles);

  return catalogFiles.filter((file) => file.endsWith('.json') || file.endsWith('.xsd'));
}

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
