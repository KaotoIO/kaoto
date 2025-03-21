import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';

/**
 * Copy the built Kaoto Camel Catalog files into the assets/camel-catalog folder
 */
async function copyCamelCatalogFiles(destinationFolder) {
  const { getCamelCatalogFiles } = await import('./get-camel-catalog-files.mjs');
  const { basePath, files: camelCatalogFiles } = getCamelCatalogFiles();

  camelCatalogFiles.forEach((file) => {
    const relativePath = relative(basePath, file);
    const destDir = resolve(destinationFolder, dirname(relativePath));

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    const dest = resolve(destDir, basename(file));
    console.info('\t', `Copying '${file}' to '${dest}'`);

    copyFileSync(file, dest);
  });
}

// eslint-disable-next-line no-undef
const dest = process.argv[2];
console.info(`Copying Kaoto Camel Catalog files to '${dest}'`, '\n');

if (!dest) {
  throw new Error('Missing destination folder');
}

if (!existsSync(dest)) {
  mkdirSync(dest, { recursive: true });
}

copyCamelCatalogFiles(dest);
