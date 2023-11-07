// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const fs = require('node:fs');
// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const path = require('node:path');
// eslint-disable-next-line no-undef, @typescript-eslint/no-var-requires
const vite = require('vite');
const { normalizePath } = vite;

/**
 * Temporary function to copy the built Kaoto Camel Catalog into the assets folder
 *
 * When dynamically importing the Camel Catalog is supported, this function can be removed
 * and this file can be restored to a .ts file.
 * Related issue: https://github.com/sveltejs/vite-plugin-svelte/issues/141#issuecomment-898900239
 */
function getCamelCatalogFiles() {
  let camelCatalogPath = '';

  try {
    // eslint-disable-next-line no-undef
    camelCatalogPath = normalizePath(path.dirname(require.resolve('@kaoto-next/camel-catalog/package.json')));
    camelCatalogPath = path.join(camelCatalogPath, 'dist');
  } catch (error) {
    console.error(error);
    /* empty */
  }

  console.info(`Found '@kaoto-next/camel-catalog' in ${camelCatalogPath}`, '\n');

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

  /** List all the JSON files in the Camel Catalog folder */
  const jsonFiles = fs
    .readdirSync(camelCatalogPath)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(camelCatalogPath, file));

  return jsonFiles;
}

// eslint-disable-next-line no-undef
module.exports = {
  getCamelCatalogFiles,
};
