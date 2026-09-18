// @ts-check
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

// Get the JSON file path from the command line arguments
const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Error: Please provide the path to the JSON file as the first argument.');
  process.exit(1);
}

// Read and parse the JSON file
const fileContent = await readFile(jsonPath, 'utf8');
const entities = JSON.parse(fileContent);

const schemas = Object.entries(entities).reduce((acc, [name, model]) => {
  console.log(`Processing schema: '${name}'`);

  acc[name] = model.propertiesSchema;

  return acc;
}, {});

const output = JSON.stringify(schemas, null, '\t');

// Get the base name of the input file
const outputFileName = path.basename(jsonPath);
// Set the output path to the assets folder with the same file name
const outputPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../assets/schemas', outputFileName);

await writeFile(outputPath, output, 'utf8');
console.log(`Schemas extracted and saved to ${outputPath}`);
