import { JSONSchemaType } from 'ajv';
import { getNonDefaultProperties } from './get-non-default-properties';
import { getNonEmptyProperties } from './get-non-empty-properties';

describe('CanvasForm getNonEmptyProperties()', () => {
  const schema = {
    type: 'object',
    properties: {
      parameters: {
        properties: {
          events: {
            type: 'string',
            default: 'CREATE,MODIFY,DELETE',
            title: 'Events',
          },
          concurrentConsumers: {
            type: 'integer',
            default: 1,
            title: 'Concurrent Consumers',
          },
          bridgeErrorHandler: {
            type: 'boolean',
            default: false,
            title: 'Bridge Error Handler',
          },
          exchangePattern: {
            type: 'object',
            title: 'Exchange Pattern',
          },
        },
      },
    },
  } as unknown as JSONSchemaType<unknown>;

  const newModel: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
      concurrentConsumers: '',
      bridgeErrorHandler: false,
      exchangePattern: {},
    },
  };

  const newModelIntermediate: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
      concurrentConsumers: '',
      exchangePattern: {},
    },
  };

  const newModelExpected: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
    },
  };

  it('should return only the properties which are different from default', () => {
    const newModelClean = getNonDefaultProperties(schema?.properties.parameters.properties, newModel);
    expect(newModelClean).toMatchObject(newModelIntermediate);
  });

  it('should return only the non-empty properties', () => {
    const newModelClean = getNonEmptyProperties(newModel);
    expect(newModelClean).toMatchObject(newModelExpected);
  });
});
