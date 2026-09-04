import { JSONSchema4 } from 'json-schema';

import { DynamicCatalogRegistry } from '../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../models/catalog-kind';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { PipeErrorHandlerService } from './pipe-error-handler.service';

/**
 * Realistic propertiesSchema as returned by the Camel catalog for the
 * 'PipeErrorHandler' entity.  The three oneOf variants mirror the real
 * catalog exactly (No / Log / Sink error handlers).
 */
const PIPE_ERROR_HANDLER_ONE_OF: JSONSchema4[] = [
  {
    title: 'No Pipe ErrorHandler',
    type: 'object',
    properties: { none: { type: 'object' } },
    required: ['none'],
  },
  {
    title: 'Log Pipe ErrorHandler',
    type: 'object',
    properties: {
      log: {
        type: 'object',
        additionalProperties: false,
        properties: {
          parameters: {
            type: 'object',
            properties: {
              maximumRedeliveries: {
                type: 'number',
                description:
                  'Sets the maximum redeliveries x = redeliver at most x times 0 = no redeliveries -1 = redeliver forever',
              },
              redeliveryDelay: {
                type: 'number',
                description: 'Sets the maximum delay between redelivery',
              },
            },
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
    required: ['log'],
  },
  {
    title: 'Sink Pipe ErrorHandler',
    type: 'object',
    properties: {
      sink: {
        type: 'object',
        additionalProperties: false,
        properties: {
          endpoint: {
            type: 'object',
            additionalProperties: false,
            properties: {
              ref: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  kind: { type: 'string' },
                  apiVersion: { type: 'string' },
                  name: { type: 'string' },
                },
                required: ['kind', 'apiVersion', 'name'],
              },
              properties: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  additionalProperties: { type: 'string' },
                },
              },
            },
          },
          parameters: {
            type: 'object',
            properties: {
              maximumRedeliveries: {
                type: 'number',
                description:
                  'Sets the maximum redeliveries x = redeliver at most x times 0 = no redeliveries -1 = redeliver forever',
              },
              redeliveryDelay: {
                type: 'number',
                description: 'Sets the maximum delay between redelivery',
              },
            },
            additionalProperties: { type: 'string' },
          },
        },
      },
    },
    required: ['sink'],
  },
];

/** Baseline propertiesSchema as it arrives from the catalog (oneOf, no anyOf). */
const makeCachedSchema = (): KaotoSchemaDefinition['schema'] => ({
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  additionalProperties: false,
  title: 'Pipe Error Handler',
  description:
    'Camel K Pipe ErrorHandler. See https://camel.apache.org/camel-k/latest/kamelets/kameletbindings-error-handler.html for more details.',
  oneOf: PIPE_ERROR_HANDLER_ONE_OF,
  properties: { none: {}, log: {}, sink: {} },
});

describe('PipeErrorHandlerService.getErrorHandlerSchema', () => {
  afterEach(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('returns undefined when the entity is not in the registry', async () => {
    const schema = await PipeErrorHandlerService.getErrorHandlerSchema();

    expect(schema).toBeUndefined();
  });

  it('returns undefined when the entity exists but has no propertiesSchema', async () => {
    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Entity, {
      get: vi.fn().mockResolvedValue({ name: 'PipeErrorHandler' }),
      getAll: vi.fn(),
      clearCache: vi.fn(),
    });

    const schema = await PipeErrorHandlerService.getErrorHandlerSchema();

    expect(schema).toBeUndefined();
  });

  it('moves oneOf into anyOf and removes oneOf from the returned schema', async () => {
    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Entity, {
      get: vi.fn().mockResolvedValue({ propertiesSchema: makeCachedSchema() }),
      getAll: vi.fn(),
      clearCache: vi.fn(),
    });

    const schema = await PipeErrorHandlerService.getErrorHandlerSchema();

    expect(schema).not.toHaveProperty('oneOf');
    expect(schema?.anyOf).toEqual([{ oneOf: PIPE_ERROR_HANDLER_ONE_OF }]);
    // Top-level catalog metadata must be preserved on the returned copy
    expect(schema?.title).toBe('Pipe Error Handler');
    expect(schema?.type).toBe('object');
  });

  it('does not mutate the cached propertiesSchema object', async () => {
    const cachedSchema = makeCachedSchema();

    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Entity, {
      get: vi.fn().mockResolvedValue({ propertiesSchema: cachedSchema }),
      getAll: vi.fn(),
      clearCache: vi.fn(),
    });

    await PipeErrorHandlerService.getErrorHandlerSchema();

    // The original cached object must remain untouched
    expect(cachedSchema).toHaveProperty('oneOf', PIPE_ERROR_HANDLER_ONE_OF);
    expect(cachedSchema).not.toHaveProperty('anyOf');
  });

  it('leaves the schema unchanged when anyOf is already present', async () => {
    const alreadyNormalized: KaotoSchemaDefinition['schema'] = {
      ...makeCachedSchema(),
      anyOf: [{ oneOf: PIPE_ERROR_HANDLER_ONE_OF }],
    };

    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Entity, {
      get: vi.fn().mockResolvedValue({ propertiesSchema: alreadyNormalized }),
      getAll: vi.fn(),
      clearCache: vi.fn(),
    });

    const schema = await PipeErrorHandlerService.getErrorHandlerSchema();

    // anyOf already exists — normalization must not fire a second time
    expect(schema?.anyOf).toHaveLength(1);
    expect(schema).toHaveProperty('oneOf'); // original oneOf preserved
  });

  it('leaves the schema unchanged when oneOf is absent', async () => {
    const noOneOf: KaotoSchemaDefinition['schema'] = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      title: 'Pipe Error Handler',
      properties: { none: {}, log: {}, sink: {} },
    };

    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Entity, {
      get: vi.fn().mockResolvedValue({ propertiesSchema: noOneOf }),
      getAll: vi.fn(),
      clearCache: vi.fn(),
    });

    const schema = await PipeErrorHandlerService.getErrorHandlerSchema();

    expect(schema).toEqual(noOneOf);
    expect(schema).not.toHaveProperty('anyOf');
    expect(schema).not.toHaveProperty('oneOf');
  });
});
