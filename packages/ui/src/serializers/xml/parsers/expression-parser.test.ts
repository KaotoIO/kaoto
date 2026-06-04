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

import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICamelProcessorDefinition } from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { ExpressionParser } from './expression-parser';

describe('Expression parser', () => {
  const xmlParser = new DOMParser();

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    // Set up DynamicCatalogRegistry for async catalog lookups
    const registry = DynamicCatalogRegistry.get();
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

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('should parse simple expression', async () => {
    const expression = xmlParser.parseFromString(
      `
          <simple>{in.body} contains 'Hello'</simple>
      `,
      'application/xml',
    ).documentElement;

    const result = await ExpressionParser.parse(expression);
    expect(result).toEqual({ simple: { expression: "{in.body} contains 'Hello'" } });
  });

  it('should parse expression type element', async () => {
    const parentElement = xmlParser.parseFromString(
      `<choice><when><xpath>/order/customer</xpath></when></choice>
      `,
      'application/xml',
    ).documentElement;
    const props = (await DynamicCatalogRegistry.get().getEntity(CatalogKind.Processor, 'when'))?.properties;
    const result = await ExpressionParser.parse(parentElement, props?.expression, 'when');
    expect(result).toEqual({ xpath: { expression: '/order/customer' } });
  });

  it('should not parse made up expression', async () => {
    const parentElement = xmlParser.parseFromString(
      `<choice><when><nonExistent>/order/customer</nonExistent></when></choice>
      `,
      'application/xml',
    ).documentElement;
    const props = (await DynamicCatalogRegistry.get().getEntity(CatalogKind.Processor, 'when'))?.properties;
    const result = await ExpressionParser.parse(parentElement, props?.expression, 'when');
    expect(result).not.toBeDefined();
  });

  it('should trim whitespace and newlines from expression text content', async () => {
    const expression = xmlParser.parseFromString(
      `
          <simple>
                    \${header.foo} == 1
                </simple>
      `,
      'application/xml',
    ).documentElement;

    const result = await ExpressionParser.parse(expression);
    expect(result).toEqual({ simple: { expression: '${header.foo} == 1' } });
  });
});
