import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, To } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { IDynamicCatalogRegistry } from '../../../dynamic-catalog/models';
import { CamelComponentsProvider } from '../../../dynamic-catalog/providers/camel-components.provider';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogKind } from '../../catalog-kind';
import { ICamelComponentDefinition } from '../camel-components-catalog';
import { toParser } from './to.parser';

describe('CatalogTilesProvider', () => {
  let mockRegistry: IDynamicCatalogRegistry;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    /* Create catalogs using actual providers with proper types */
    const componentCatalog = new DynamicCatalog<ICamelComponentDefinition>(
      new CamelComponentsProvider(catalogsMap.componentCatalogMap),
    );

    /* Setup mock registry */
    mockRegistry = DynamicCatalogRegistry.get();
    mockRegistry.setCatalog(CatalogKind.Component, componentCatalog);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const TEST_CASES: [To, Exclude<To, 'string'> | undefined][] = [
    ['direct:my-exit-route', { uri: 'direct', parameters: { name: 'my-exit-route' } }],
    ['direct:my-exit-route?name=my-exit-route', { uri: 'direct', parameters: { name: 'my-exit-route' } }],
    [
      { uri: 'direct', parameters: { name: 'route-66' } },
      { uri: 'direct', parameters: { name: 'route-66' } },
    ],
    [
      { uri: 'log:my-log-route?level=INFO&multiline=true' },
      { uri: 'log', parameters: { loggerName: 'my-log-route', level: 'INFO', multiline: true } },
    ],
    [{ uri: '' }, { parameters: {}, uri: '' }],
    [{ uri: undefined }, { parameters: {}, uri: '' }],
  ];

  it.each(TEST_CASES)('should return a valid To object for %s', async (input, expected) => {
    const result = await toParser(input);

    expect(result).toEqual(expected);
  });
});
