import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { ICamelProcessorDefinition } from '../../../../../camel/camel-processors-catalog';
import { CatalogKind } from '../../../../../catalog-kind';
import { KaotoSchemaDefinition } from '../../../../../kaoto-schema';
import { NodeSchemaResolver } from './node-schema-resolver';

const createMockProcessorDefinition = (schema: KaotoSchemaDefinition['schema']): ICamelProcessorDefinition => ({
  model: {
    kind: CatalogKind.Processor,
    name: 'mock',
    title: 'Mock',
    deprecated: false,
    label: '',
  },
  properties: {},
  propertiesSchema: schema,
});

describe('NodeSchemaResolver.getProcessorSchema', () => {
  it('should return empty schema when processor has no propertiesSchema', async () => {
    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity').mockResolvedValue(undefined);

    const result = await NodeSchemaResolver.getProcessorSchema('from.steps.0.log', { log: {} });

    expect(result).toEqual({});
  });

  it('should resolve schema for a standalone processor', async () => {
    const mockSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity').mockResolvedValue(createMockProcessorDefinition(mockSchema));

    const result = await NodeSchemaResolver.getProcessorSchema('from.steps.0.log', { log: {} });

    expect(DynamicCatalogRegistry.get().getEntity).toHaveBeenCalledWith(CatalogKind.Pattern, 'log');
    expect(result).toEqual(mockSchema);
  });

  it.each([
    ['route', CatalogKind.Entity],
    ['intercept', CatalogKind.Entity],
    ['interceptFrom', CatalogKind.Entity],
    ['interceptSendToEndpoint', CatalogKind.Entity],
    ['onException', CatalogKind.Entity],
    ['onCompletion', CatalogKind.Entity],
    ['from', CatalogKind.Entity],
    ['log', CatalogKind.Pattern],
    ['to', CatalogKind.Pattern],
    ['choice', CatalogKind.Pattern],
    ['filter', CatalogKind.Pattern],
  ] as const)('should resolve %s processor with catalog kind %s', async (processorName, expectedCatalogKind) => {
    const mockSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        testProp: { type: 'string' },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity').mockResolvedValue(createMockProcessorDefinition(mockSchema));

    const result = await NodeSchemaResolver.getProcessorSchema(processorName, {});

    expect(DynamicCatalogRegistry.get().getEntity).toHaveBeenCalledWith(expectedCatalogKind, processorName);
    expect(result).toEqual(mockSchema);
  });

  it('should merge component schema for processors with components', async () => {
    const processorSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        uri: { type: 'string' },
      },
    };

    const componentSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        period: { type: 'number' },
        delay: { type: 'number' },
      },
      required: ['period'],
    };

    const getEntitySpy = vi
      .spyOn(DynamicCatalogRegistry.get(), 'getEntity')
      .mockResolvedValueOnce(createMockProcessorDefinition(processorSchema))
      .mockResolvedValueOnce(createMockProcessorDefinition(componentSchema));

    const result = await NodeSchemaResolver.getProcessorSchema('to', { uri: 'timer:tick' });

    expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.Pattern, 'to');
    expect(getEntitySpy).toHaveBeenCalledWith(CatalogKind.Component, 'timer', {});
    expect(result.properties?.parameters?.properties).toEqual(componentSchema.properties);
    expect(result.properties?.parameters?.required).toEqual(['period']);
    expect(result.properties?.parameters?.['x-component-name']).toBe('timer');
  });

  it('should filter producer properties for from processor', async () => {
    const processorSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        uri: { type: 'string' },
      },
    };

    const componentSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        fileName: { type: 'string', $comment: 'consumer' },
        delete: { type: 'boolean', $comment: 'consumer' },
        fileExist: { type: 'string', $comment: 'producer' },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity')
      .mockResolvedValueOnce(createMockProcessorDefinition(processorSchema))
      .mockResolvedValueOnce(createMockProcessorDefinition(componentSchema));

    const result = await NodeSchemaResolver.getProcessorSchema('from', { uri: 'file:input' });

    const resultProperties = result.properties?.parameters?.properties ?? {};
    expect(Object.keys(resultProperties)).toContain('fileName');
    expect(Object.keys(resultProperties)).toContain('delete');
    expect(Object.keys(resultProperties)).not.toContain('fileExist');
  });

  it('should filter consumer properties for to processor', async () => {
    const processorSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        uri: { type: 'string' },
      },
    };

    const componentSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        fileName: { type: 'string', $comment: 'consumer' },
        delete: { type: 'boolean', $comment: 'consumer' },
        fileExist: { type: 'string', $comment: 'producer' },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity')
      .mockResolvedValueOnce(createMockProcessorDefinition(processorSchema))
      .mockResolvedValueOnce(createMockProcessorDefinition(componentSchema));

    const result = await NodeSchemaResolver.getProcessorSchema('to', { uri: 'file:output' });

    const resultProperties = result.properties?.parameters?.properties ?? {};
    expect(Object.keys(resultProperties)).not.toContain('fileName');
    expect(Object.keys(resultProperties)).not.toContain('delete');
    expect(Object.keys(resultProperties)).toContain('fileExist');
  });

  it('should handle kamelet: prefix components', async () => {
    const processorSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        uri: { type: 'string' },
      },
    };

    const kameletSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        topic: { type: 'string' },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity')
      .mockResolvedValueOnce(createMockProcessorDefinition(processorSchema))
      .mockResolvedValueOnce(createMockProcessorDefinition(kameletSchema));

    const result = await NodeSchemaResolver.getProcessorSchema('from', { uri: 'kamelet:kafka-source' });

    expect(DynamicCatalogRegistry.get().getEntity).toHaveBeenCalledWith(CatalogKind.Kamelet, 'kafka-source', {});
    expect(result.properties?.parameters?.properties).toEqual(kameletSchema.properties);
  });

  it('should fallback to kamelet component when kamelet not found', async () => {
    const processorSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        uri: { type: 'string' },
      },
    };

    const kameletComponentSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity')
      .mockResolvedValueOnce(createMockProcessorDefinition(processorSchema))
      .mockResolvedValueOnce(undefined) // Kamelet not found
      .mockResolvedValueOnce(createMockProcessorDefinition(kameletComponentSchema));

    const result = await NodeSchemaResolver.getProcessorSchema('from', { uri: 'kamelet:unknown-kamelet' });

    expect(DynamicCatalogRegistry.get().getEntity).toHaveBeenCalledWith(CatalogKind.Kamelet, 'unknown-kamelet', {});
    expect(DynamicCatalogRegistry.get().getEntity).toHaveBeenCalledWith(CatalogKind.Component, 'kamelet', {});
    expect(result.properties?.parameters?.properties).toEqual(kameletComponentSchema.properties);
  });

  it('should handle missing KameletConfiguration for Kamelet root', async () => {
    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity').mockResolvedValue(undefined);

    const result = await NodeSchemaResolver.getProcessorSchema('template', {});

    expect(DynamicCatalogRegistry.get().getEntity).toHaveBeenCalledWith(CatalogKind.Entity, 'KameletConfiguration');
    expect(result).toEqual({});
  });

  it('should initialize processorSchema.properties when merging component schema', async () => {
    const processorSchemaWithoutProps: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      // No properties field
    };

    const componentSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        host: { type: 'string' },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity')
      .mockResolvedValueOnce(createMockProcessorDefinition(processorSchemaWithoutProps))
      .mockResolvedValueOnce(createMockProcessorDefinition(componentSchema));

    const result = await NodeSchemaResolver.getProcessorSchema('to', { uri: 'http:example.com' });

    expect(result.properties).toBeDefined();
    expect(result.properties?.parameters).toBeDefined();
    expect(result.properties?.parameters?.properties).toEqual(componentSchema.properties);
  });
});

describe('NodeSchemaResolver.getEntitySchema', () => {
  it('should fetch entity schema from catalog', async () => {
    const mockSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
    };

    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity').mockResolvedValue(createMockProcessorDefinition(mockSchema));

    const result = await NodeSchemaResolver.getEntitySchema('routeConfiguration');

    expect(DynamicCatalogRegistry.get().getEntity).toHaveBeenCalledWith(CatalogKind.Entity, 'routeConfiguration');
    expect(result).toEqual(mockSchema);
  });

  it('should handle errors gracefully and return empty object', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity').mockRejectedValue(new Error('Catalog unavailable'));

    const result = await NodeSchemaResolver.getEntitySchema('routeConfiguration');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to fetch Entity schema for routeConfiguration:',
      expect.any(Error),
    );
    expect(result).toEqual({});

    consoleWarnSpy.mockRestore();
  });

  it('should return empty object when entity definition has no schema', async () => {
    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity').mockResolvedValue({
      // No propertiesSchema field
    });

    const result = await NodeSchemaResolver.getEntitySchema('intercept');

    expect(result).toEqual({});
  });
});
