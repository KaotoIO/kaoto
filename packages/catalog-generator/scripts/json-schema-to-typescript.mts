#!/usr/bin/env ts-node

/**
 * This script generates TypeScript types from the JSON schemas in the dist folder.
 */
import { mkdir, writeFile } from 'fs/promises';
import { JSONSchema, compile } from 'json-schema-to-typescript';
import { pathToFileURL } from 'node:url';
import { resolve } from 'path';
import { rimraf } from 'rimraf';
import catalogLibraryIndex from '../dist/camel-catalog/index.json' assert { type: 'json' };
import { CatalogDefinition } from '../dist/types/catalog-index';

/** Function to ensure the dist/types folder is created and empty */
const ensureTypesFolder = async () => {
  const typesFolder = resolve('./dist/types');

  await rimraf(typesFolder, { filter: (path) => !path.includes('catalog-index.d.ts') });
  await mkdir(typesFolder, { recursive: true });
};

/** Function to compile a JSON schema file to a TypeScript file */
const compileSchema = async (schemaContent: JSONSchema, name: string, outputFile: string) => {
  const ts = await compile(schemaContent, name);
  await writeFile(outputFile, ts);
};

/**
 * Function to add a title property for schema properties that doesn't contains it
 * The goal for this is to provide a better naming for the generated types
 */
const addTitleToDefinitions = (schema: JSONSchema) => {
  if (!schema.items || Array.isArray(schema.items) || !schema.items.definitions) {
    return;
  }

  Object.entries(schema.items.definitions).forEach(([key, value]) => {
    if (value.title) {
      return;
    }

    const title = key.split('.').slice(-1).join('');
    console.log(`\tAdding title to ${key}: ${title}`);

    value.title = title;
  });
};

/** Main function */
async function main() {
  await ensureTypesFolder();

  const exportedFiles: string[] = ['catalog-index'];

  console.log('---');
  const targetSchemaNames = ['camelYamlDsl', 'Integration', 'Kamelet', 'KameletBinding', 'Pipe'];

  if (!Array.isArray(catalogLibraryIndex.definitions) || !catalogLibraryIndex.definitions.length) {
    throw new Error('Invalid catalog index file, a Catalog needs to be generated first');
  }

  const indexDefinitionFileName = catalogLibraryIndex.definitions[0].fileName;

  /**
   * In windows, path starting with C:\ are not supported
   * We need to add file:// to the path to make it work
   * [pathToFileURL](https://nodejs.org/api/url.html#url_url_pathtofileurl_path)
   * Related issue: https://github.com/nodejs/node/issues/31710
   */
  const indexFileUri = pathToFileURL(`./dist/camel-catalog/${indexDefinitionFileName}`).toString();
  const indexDefinitionContent: CatalogDefinition = (await import(indexFileUri, { assert: { type: 'json' } })).default;

  const schemaPromises = Object.entries(indexDefinitionContent.schemas).map(async ([name, schema]) => {
    if (!targetSchemaNames.includes(name)) {
      return;
    }

    const baseFolder = indexFileUri.substring(0, indexFileUri.lastIndexOf('/'));
    const schemaFile = `${baseFolder}/${schema.file}`;
    const schemaContent = (await import(schemaFile, { assert: { type: 'json' } })).default;

    addTitleToDefinitions(schemaContent);

    /** Remove the -4.0.0.json section of the filename */
    const outputFile = resolve(`./dist/types/${name}.d.ts`);

    /** Add the file to the exported files */
    exportedFiles.push(name);

    console.log(`Input: '${schemaFile}'`);
    console.log(`Output: ${outputFile}`);
    console.log('---');

    return compileSchema(schemaContent, name, outputFile);
  });
  await Promise.all(schemaPromises);

  /** Generate the index file */
  const indexFile = resolve(`./dist/types/index.ts`);
  const indexContent = exportedFiles.map((file) => `export * from './${file}';`).join('\n');
  await writeFile(indexFile, indexContent);
}

main();
