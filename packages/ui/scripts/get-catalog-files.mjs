import { existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
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
      throw new Error('Camel Catalog directory is empty');
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

  console.info(`Found '@kaoto/camel-catalog' using ${camelCatalogPath}`, '\n');

  /** Recursively list all the JSON and XSD files in the Camel Catalog folder and subfolders */
  const catalogFiles = [];
  getFilesRecursively(camelCatalogPath, catalogFiles);

  const additionalMappings = [];
  try {
    const packageJsonPath = require.resolve('@kaoto/camel-catalog/package.json');
    const packageRoot = normalizePath(dirname(packageJsonPath));
    const xpathDir = join(packageRoot, 'dist', 'xpath-functions');
    if (existsSync(xpathDir)) {
      const xpathFiles = [];
      getFilesRecursively(xpathDir, xpathFiles);
      for (const file of xpathFiles.filter((f) => f.endsWith('.json'))) {
        additionalMappings.push({
          urlPath: 'xpath-functions/' + normalizePath(relative(xpathDir, file)),
          filePath: file,
        });
      }
    }
  } catch {
    /* xpath-functions not available in this camel-catalog version */
  }

  return {
    basePath: camelCatalogPath,
    files: catalogFiles.filter((file) => file.endsWith('.json') || file.endsWith('.xsd')),
    additionalMappings,
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
