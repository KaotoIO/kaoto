import { KaotoSchemaDefinition } from '../models/kaoto-schema';
import { getNonDefaultProperties } from './get-non-default-properties';

describe('getNonDefaultProperties()', () => {
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
        },
      },
    },
  } as unknown as KaotoSchemaDefinition['schema'];

  const newModel: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
      concurrentConsumers: '1',
      bridgeErrorHandler: false,
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
    const newModelClean = getNonDefaultProperties(schema.properties!.parameters.properties!, newModel);
    expect(newModelClean).toMatchObject(newModelExpected);
  });
});
