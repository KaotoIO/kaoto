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
  // https://repo1.maven.org/maven2/org/apache/camel/camel/
  Main: ['4.8.1', '4.4.4', '4.4.0.redhat-00046', '4.8.0.redhat-00017'],
  // https://repo1.maven.org/maven2/org/apache/camel/quarkus/camel-quarkus/
  Quarkus: ['3.16.0', '3.8.4', '3.8.0.redhat-00018', '3.15.0.redhat-00007'],
  // https://repo1.maven.org/maven2/org/apache/camel/springboot/spring-boot/
  SpringBoot: ['4.8.1', '4.4.4', '4.4.0.redhat-00039', '4.8.0.redhat-00022'],
};
// https://repo1.maven.org/maven2/org/apache/camel/kamelets/camel-kamelets/
const KAMELETS_VERSION = '4.8.1';

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
