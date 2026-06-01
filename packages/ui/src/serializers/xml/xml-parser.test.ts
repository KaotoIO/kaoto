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

import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalog } from '../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICamelProcessorDefinition } from '../../models';
import { doTryCamelRouteJson, doTryCamelRouteXml } from '../../stubs';
import { beanWithConstructorAandProperties, beanWithConstructorAandPropertiesXML } from '../../stubs/beans';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { isXML, KaotoXmlParser } from './kaoto-xml-parser';

describe('XmlParser', () => {
  let parser: KaotoXmlParser;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

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

  beforeEach(async () => {
    parser = new KaotoXmlParser();
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('parses XML with a single route correctly', async () => {
    const xml = `<camel><routes><route><from uri="direct:start" /></route></routes></camel>`;
    const result = await parser.parseXML(xml);

    expect(result).toBeDefined();
    expect(result).toEqual([
      {
        route: {
          from: { uri: 'direct:start', steps: [] },
        },
      },
    ]);
  });

  it('parses XML with multiple routes correctly', async () => {
    const xml = `<routes><route id="test"><from uri="direct:first" /></route><route><from uri="direct:second" /></route></routes>`;
    const result = await parser.parseXML(xml);
    expect(result).toEqual([
      {
        route: { id: 'test', from: { uri: 'direct:first', steps: [] } },
      },
      {
        route: {
          from: { uri: 'direct:second', steps: [] },
        },
      },
    ]);
  });

  it('returns an empty array for XML with no routes', async () => {
    const xml = `<routes></routes>`;
    const result = await parser.parseXML(xml);
    expect(result).toEqual([]);
  });

  it('identifies valid XML correctly', () => {
    const xml = `<routes><route><from uri="direct:start" /></route></routes>`;
    expect(isXML(xml)).toBe(true);
  });

  it('identifies invalid XML correctly', () => {
    const xml = `not an xml`;
    expect(isXML(xml)).toBe(false);
  });

  it('parses XML with doTry correctly', async () => {
    const result = await parser.parseXML(doTryCamelRouteXml);
    expect(result).toEqual([doTryCamelRouteJson]);
  });

  it('parse beans correctly', async () => {
    const result = await parser.parseXML(beanWithConstructorAandPropertiesXML);
    expect(result).toEqual([beanWithConstructorAandProperties]);
  });
});
