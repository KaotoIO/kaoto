#!/usr/bin/env ts-node
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * This script generates TypeScript types from the JSON schemas in the dist folder.
 */
import { JSONSchema, compile } from 'json-schema-to-typescript';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import index from '../dist/index.json' assert { type: 'json' };
import { rimraf } from 'rimraf';

/** Function to ensure the dist/types folder is created and empty */
const ensureTypesFolder = async () => {
  const typesFolder = resolve('./dist/types');

  await rimraf(typesFolder);
  await mkdir(typesFolder);
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
    console.log(`Adding title to ${key}: ${title}`);

    value.title = title;
  });
};

/** Main function */
async function main() {
  await ensureTypesFolder();

  const exportedFiles: string[] = [];

  console.log('---');
  const schemaPromises = index.schemas.map(async (schema) => {
    const schemaFile = resolve(`./dist/${schema.file}`);
    const schemaContent = (await import(resolve(`./dist/${schema.file}`), { assert: { type: 'json' } })).default;

    let filename = schema.name;

    if (schema.file.includes('camelYamlDsl')) {
      addTitleToDefinitions(schemaContent);
      filename = 'camelYamlDsl';
    }

    /** Remove the -4.0.0.json section of the filename */
    const outputFile = resolve(`./dist/types/${filename}.d.ts`);

    /** Add the file to the exported files */
    exportedFiles.push(filename);

    console.log(`Input: '${schemaFile}'`);
    console.log(`Output: ${outputFile}`);
    console.log('---');

    return compileSchema(schemaContent, filename, outputFile);
  });

  await Promise.all(schemaPromises);

  /** Generate the index file */
  const indexFile = resolve(`./dist/types/index.ts`);
  const indexContent = exportedFiles.map((file) => `export * from './${file}';`).join('\n');
  await writeFile(indexFile, indexContent);
}

main();
