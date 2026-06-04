/*
 * Copyright (C) 2025 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'node:fs';
import path from 'node:path';

import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICamelProcessorDefinition } from '../../../models';
import { restWithVerbsStup } from '../../../stubs/rest';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { RestXmlParser } from './rest-xml-parser';

describe('Rest XML Parser', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    // Set up DynamicCatalogRegistry for async catalog lookups
    const registry = DynamicCatalogRegistry.get();

    // Create processor catalog from catalogsMap.modelCatalogMap
    const processorProvider = {
      id: 'test-processor-provider',
      fetch: async (key: string) => {
        return catalogsMap.modelCatalogMap[key];
      },
      fetchAll: async () => {
        return catalogsMap.modelCatalogMap;
      },
    };

    const processorCatalog = new DynamicCatalog<ICamelProcessorDefinition>(processorProvider);
    registry.setCatalog(CatalogKind.Processor, processorCatalog);
  });

  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('should parse rest verbs correctly using async DynamicCatalog', async () => {
    const xmlFilePath = path.join(__dirname, '../../../stubs/xml/rest.xml');
    const xml = fs.readFileSync(xmlFilePath, 'utf-8');

    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const restElement = doc.getElementsByTagName('rest')[0];
    const result = RestXmlParser.parse(restElement);

    // Should return a Promise
    expect(result).toBeInstanceOf(Promise);

    // Await the promise and verify the result
    const rest = await result;
    expect(rest).toBeDefined();
    expect(rest).toEqual(restWithVerbsStup);
  });
});
