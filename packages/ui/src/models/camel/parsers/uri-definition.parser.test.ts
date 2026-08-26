import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { CamelComponentsProvider } from '../../../dynamic-catalog/providers/camel-components.provider';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogKind } from '../../catalog-kind';
import { ICamelComponentDefinition } from '../camel-components-catalog';
import { uriDefinitionParser } from './uri-definition.parser';

describe('uriDefinitionParser', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    const componentCatalog = new DynamicCatalog<ICamelComponentDefinition>(
      new CamelComponentsProvider(catalogsMap.componentCatalogMap),
    );
    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Component, componentCatalog);
  });

  afterEach(() => {
    vi.clearAllMocks();
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('should split path and query params for a known component', async () => {
    const result = await uriDefinitionParser('log', { uri: 'log:myLogger?level=INFO', parameters: {} });
    expect(result).toMatchObject({ uri: 'log', parameters: { loggerName: 'myLogger', level: 'INFO' } });
  });

  it('should handle a kamelet URI', async () => {
    const result = await uriDefinitionParser('kamelet:beer-source', {
      uri: 'kamelet:beer-source?foo=bar',
      parameters: {},
    });
    expect(result).toMatchObject({ uri: 'kamelet:beer-source', parameters: { foo: 'bar' } });
  });

  it('should return definition with empty parameters for an unknown component with no query string', async () => {
    const result = await uriDefinitionParser('non-existing', { uri: 'non-existing:thing' });
    expect(result).toEqual({ uri: 'non-existing:thing', parameters: {} });
  });

  it('should extract query parameters for an unknown component with a query string', async () => {
    const result = await uriDefinitionParser('non-existing', { uri: 'non-existing:thing?foo=bar' });
    expect(result).toEqual({ uri: 'non-existing:thing', parameters: { foo: 'bar' } });
  });

  it('should ensure parameters exists for a kamelet URI with no query string', async () => {
    const result = await uriDefinitionParser('kamelet:log-sink', { uri: 'kamelet:log-sink' });
    expect(result).toEqual({ uri: 'kamelet:log-sink', parameters: {} });
  });

  it('should return definition unchanged when uri is empty', async () => {
    const definition = { uri: '', parameters: {} };
    const result = await uriDefinitionParser('log', definition);
    expect(result).toEqual(definition);
  });

  it('should preserve existing parameters and merge new ones', async () => {
    const result = await uriDefinitionParser('log', {
      uri: 'log:myLogger',
      parameters: { level: 'DEBUG' },
    });
    expect(result).toMatchObject({
      uri: 'log',
      parameters: expect.objectContaining({ level: 'DEBUG', loggerName: 'myLogger' }),
    });
  });
});
