#!/usr/bin/env ts-node
// @ts-check

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { resolve } from 'path';
import { existsSync } from 'node:fs';

const require = createRequire(import.meta.url);

/**
 * @type {Record<import('../dist/types').CatalogRuntime, string[]>}
 **/
const CATALOGS = {
  // https://repo1.maven.org/maven2/org/apache/camel/camel-catalog/
  // https://maven.repository.redhat.com/ga/org/apache/camel/camel-catalog/
  Main: [
    //
    '4.11.0',
    '4.10.4',
    '4.8.6',
    '4.10.3.redhat-00020',
    '4.8.5.redhat-00008',
    '4.4.0.redhat-00046',
  ],
  // https://repo1.maven.org/maven2/org/apache/camel/quarkus/camel-quarkus-catalog/
  // https://maven.repository.redhat.com/ga/org/apache/camel/quarkus/camel-quarkus-catalog/
  Quarkus: [
    //
    '3.20.0', // Camel 4.10.2
    '3.15.3', // Camel 4.8.5
    '3.20.0.redhat-00002', // Camel 4.10.3.redhat-00020
    '3.15.0.redhat-00010', // Camel 4.8.0.redhat-00015
    '3.8.0.redhat-00018', // Camel 4.4.0.redhat-00046
  ],
  // https://repo1.maven.org/maven2/org/apache/camel/springboot/camel-catalog-provider-springboot/
  // https://maven.repository.redhat.com/ga/org/apache/camel/springboot/camel-catalog-provider-springboot/
  SpringBoot: [
    //
    '4.11.0',
    '4.10.4',
    '4.8.6',
    '4.10.3.redhat-00019',
    '4.8.5.redhat-00008',
    '4.4.0.redhat-00039',
  ],
};
// https://repo1.maven.org/maven2/org/apache/camel/kamelets/camel-kamelets/
const KAMELETS_VERSION = '4.11.0';

const generateCatalogs = () => {
  let camelCatalogPath = '';
  try {
    const camelCatalogIndexJsonPath = require.resolve('@kaoto/camel-catalog/catalog-index.d.ts');
    camelCatalogPath = dirname(camelCatalogIndexJsonPath);
  } catch (error) {
    throw new Error(`Could not find '@kaoto/camel-catalog' \n\n ${error}`);
  } finally {
    if (camelCatalogPath) console.log(`Found '@kaoto/camel-catalog' in ${camelCatalogPath}`, '\n');
  }

  const binary = resolve(camelCatalogPath, '../../target/catalog-generator-0.0.1-SNAPSHOT.jar');
  if (!existsSync(binary)) {
    throw new Error(`Could not find the catalog-generator JAR at ${binary}`);
  }

  const destinationFolder = resolve(camelCatalogPath, '../../dist/camel-catalog');
  const args = [
    '-jar',
    binary,
    '-o',
    destinationFolder,
    '-n',
    'Default Kaoto catalog',
    '-k',
    KAMELETS_VERSION,
    ...getVersionArguments(),
  ];

  spawn('java', args, {
    stdio: 'inherit',
  });
};

const getVersionArguments = () => {
  /** @type string[] */
  const starter = [];

  return Object.entries(CATALOGS).reduce((acc, [runtime, versions]) => {
    const flag = runtime.slice(0, 1).toLowerCase();

    versions.forEach((version) => {
      acc.push(`-${flag}`);
      acc.push(version);
    });

    return acc;
  }, starter);
};

generateCatalogs();
