// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const fs = require('node:fs');
// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const path = require('node:path');
// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const { getCamelCatalogFiles } = require('./get-camel-catalog-files.cjs');

/**
 * Copy the built Kaoto Camel Catalog files into the assets/camel-catalog folder
 */
function copyCamelCatalogFiles(destinationFolder) {
  const camelCatalogFiles = getCamelCatalogFiles();

  camelCatalogFiles.forEach((file) => {
    const dest = path.resolve(path.join(destinationFolder, path.basename(file)));

    console.info('\t', `Copying '${file}' to '${dest}'`);

    fs.copyFileSync(file, dest);
  });
}

// eslint-disable-next-line no-undef
const dest = process.argv[2];
console.info(`Copying Kaoto Camel Catalog files to '${dest}'`, '\n');

if (!dest) {
  throw new Error('Missing destination folder');
}

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest, { recursive: true });
}

copyCamelCatalogFiles(dest);
