import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { CamelComponentsProvider } from '../../../dynamic-catalog/providers/camel-components.provider';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { ICamelComponentDefinition } from '../../camel/camel-components-catalog';
import { CatalogKind } from '../../catalog-kind';
import { normalizeDefinition } from './definition-normalizer';

describe('normalizeDefinition', () => {
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

  // --- Existing URI expansion cases (renamed from uriDefinitionParser) ---

  it('should split path and query params for a known component', async () => {
    const result = await normalizeDefinition(
      { uri: 'log:myLogger?level=INFO', parameters: {} },
      {
        secondaryNodeId: { name: 'log', catalogKind: CatalogKind.Component },
      },
    );
    expect(result).toMatchObject({ uri: 'log', parameters: { loggerName: 'myLogger', level: 'INFO' } });
  });

  it('should handle a kamelet URI', async () => {
    const result = await normalizeDefinition(
      { uri: 'kamelet:beer-source?foo=bar', parameters: {} },
      {
        secondaryNodeId: { name: 'kamelet', catalogKind: CatalogKind.Component },
        tertiaryNodeId: { name: 'beer-source', catalogKind: CatalogKind.Kamelet },
      },
    );
    expect(result).toMatchObject({ uri: 'kamelet:beer-source', parameters: { foo: 'bar' } });
  });

  it('should return definition with empty parameters for an unknown component with no query string', async () => {
    const result = await normalizeDefinition(
      { uri: 'non-existing:thing' },
      {
        secondaryNodeId: { name: 'non-existing', catalogKind: CatalogKind.Component },
      },
    );
    expect(result).toEqual({ uri: 'non-existing:thing', parameters: {} });
  });

  it('should extract query parameters for an unknown component with a query string', async () => {
    const result = await normalizeDefinition(
      { uri: 'non-existing:thing?foo=bar' },
      {
        secondaryNodeId: { name: 'non-existing', catalogKind: CatalogKind.Component },
      },
    );
    expect(result).toEqual({ uri: 'non-existing:thing', parameters: { foo: 'bar' } });
  });

  it('should ensure parameters exists for a kamelet URI with no query string', async () => {
    const result = await normalizeDefinition(
      { uri: 'kamelet:log-sink' },
      {
        secondaryNodeId: { name: 'kamelet', catalogKind: CatalogKind.Component },
        tertiaryNodeId: { name: 'log-sink', catalogKind: CatalogKind.Kamelet },
      },
    );
    expect(result).toEqual({ uri: 'kamelet:log-sink', parameters: {} });
  });

  it('should return definition unchanged when uri is empty', async () => {
    const definition = { uri: '', parameters: {} };
    const result = await normalizeDefinition(definition, {
      secondaryNodeId: { name: 'log', catalogKind: CatalogKind.Component },
    });
    expect(result).toEqual(definition);
  });

  it('should preserve existing parameters and merge new ones', async () => {
    const result = await normalizeDefinition(
      { uri: 'log:myLogger', parameters: { level: 'DEBUG' } },
      { secondaryNodeId: { name: 'log', catalogKind: CatalogKind.Component } },
    );
    expect(result).toMatchObject({
      uri: 'log',
      parameters: expect.objectContaining({ level: 'DEBUG', loggerName: 'myLogger' }),
    });
  });

  // --- New cases for absorbed normalization steps ---

  it('should return definition unchanged when definition is null', async () => {
    const result = await normalizeDefinition(null);
    expect(result).toBeNull();
  });

  it('should return definition unchanged when definition is undefined', async () => {
    const result = await normalizeDefinition(undefined);
    expect(result).toBeUndefined();
  });

  it('should replace null parameters with an empty object', async () => {
    const result = await normalizeDefinition({ uri: 'log', parameters: null });
    expect((result as Record<string, unknown>).parameters).toEqual({});
  });

  it('should replace undefined parameters with an empty object', async () => {
    const result = await normalizeDefinition({ uri: 'log', parameters: undefined });
    expect((result as Record<string, unknown>).parameters).toEqual({});
  });

  it('should return raw definition unchanged when no componentName (no secondaryNodeId)', async () => {
    const definition = { expression: { simple: { expression: '${body}' } } };
    const result = await normalizeDefinition(definition, {
      primaryNodeId: { name: 'setHeader', catalogKind: CatalogKind.Pattern },
    });
    expect(result).toEqual(definition);
  });

  it('should preserve a question mark embedded in a query parameter value', async () => {
    // URI where the query value itself contains a '?': non-existing:thing?pattern=a?b
    // A naive split('?') would truncate the value to 'a' and discard 'b'.
    const result = await normalizeDefinition(
      { uri: 'non-existing:thing?pattern=a?b' },
      {
        secondaryNodeId: { name: 'non-existing', catalogKind: CatalogKind.Component },
      },
    );
    expect(result).toEqual({ uri: 'non-existing:thing', parameters: { pattern: 'a?b' } });
  });
});
