import { getRequiredPropertiesSchema } from './get-required-properties-schema';
import { KaotoSchemaDefinition } from '../models/kaoto-schema';

describe('getRequiredPropertiesSchema()', () => {
  const schema = {
    type: 'object',
    properties: {
      id: {
        title: 'Id',
        type: 'string',
      },
      description: {
        title: 'Description',
        type: 'string',
      },
      uri: {
        title: 'Uri',
        type: 'string',
      },
      variableReceive: {
        title: 'Variable Receive',
        type: 'string',
      },
      parameters: {
        type: 'object',
        title: 'Endpoint Properties',
        description: 'Endpoint properties description',
        properties: {
          timerName: {
            title: 'Timer Name',
            type: 'string',
          },
          delay: {
            title: 'Delay',
            type: 'string',
            default: '1000',
          },
          fixedRate: {
            title: 'Fixed Rate',
            type: 'boolean',
            default: false,
          },
          includeMetadata: {
            title: 'Include Metadata',
            type: 'boolean',
            default: false,
          },
          period: {
            title: 'Period',
            type: 'string',
            default: '1000',
          },
          repeatCount: {
            title: 'Repeat Count',
            type: 'integer',
          },
          exceptionHandler: {
            title: 'Exception Handler',
            type: 'string',
            $comment: 'class:org.apache.camel.spi.ExceptionHandler',
          },
          exchangePattern: {
            title: 'Exchange Pattern',
            type: 'string',
            enum: ['InOnly', 'InOut'],
          },
          synchronous: {
            title: 'Synchronous',
            type: 'boolean',
            default: false,
          },
          timer: {
            title: 'Timer',
            type: 'string',
            $comment: 'class:java.util.Timer',
          },
          runLoggingLevel: {
            title: 'Run Logging Level',
            type: 'string',
            default: 'TRACE',
            enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
          },
        },
        required: ['timerName', 'fixedRate', 'repeatCount', 'exceptionHandler', 'runLoggingLevel'],
      },
      kameletProperties: {
        title: 'Properties',
        type: 'array',
        description: 'Configure properties on the Kamelet',
        items: {
          type: 'object',
          properties: {
            name: {
              title: 'Property name',
              description: 'Name of the property',
              type: 'string',
            },
            title: {
              title: 'Title',
              description: 'Display name of the property',
              type: 'string',
            },
            description: {
              title: 'Description',
              description: 'Simple text description of the property',
              type: 'string',
            },
            type: {
              title: 'Property type',
              description: 'Set the expected type for this property',
              type: 'string',
              enum: ['string', 'number', 'boolean'],
              default: 'string',
            },
            default: {
              title: 'Default',
              description: 'Default value for the property',
              type: 'string',
            },
            'x-descriptors': {
              title: 'X-descriptors',
              description: 'Specific aids for the visual tools',
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['name', 'type'],
        },
      },
      labels: {
        additionalProperties: {
          default: '',
          type: 'string',
        },
        title: 'Additional Labels',
        description:
          'Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels',
        type: 'object',
      },
    },
    required: ['id', 'uri', 'labels'],
  } as unknown as KaotoSchemaDefinition['schema'];

  const expectedSchema = {
    type: 'object',
    properties: {
      id: {
        title: 'Id',
        type: 'string',
      },
      uri: {
        title: 'Uri',
        type: 'string',
      },
      parameters: {
        type: 'object',
        title: 'Endpoint Properties',
        description: 'Endpoint properties description',
        properties: {
          timerName: {
            title: 'Timer Name',
            type: 'string',
          },
          fixedRate: {
            title: 'Fixed Rate',
            type: 'boolean',
            default: false,
          },
          repeatCount: {
            title: 'Repeat Count',
            type: 'integer',
          },
          exceptionHandler: {
            title: 'Exception Handler',
            type: 'string',
            $comment: 'class:org.apache.camel.spi.ExceptionHandler',
          },
          runLoggingLevel: {
            title: 'Run Logging Level',
            type: 'string',
            default: 'TRACE',
            enum: ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'],
          },
        },
        required: ['timerName', 'fixedRate', 'repeatCount', 'exceptionHandler', 'runLoggingLevel'],
      },
      labels: {
        additionalProperties: {
          default: '',
          type: 'string',
        },
        title: 'Additional Labels',
        description:
          'Map of string keys and values that can be used to organize and categorize (scope and select) objects. May match selectors of replication controllers and services. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels',
        type: 'object',
      },
    },
    required: ['id', 'uri', 'labels'],
  };

  it('should return only the properties which are user Modified', () => {
    const procesedSchema = getRequiredPropertiesSchema(schema);
    expect(procesedSchema).toMatchObject(expectedSchema);
  });

  it('should return {}', () => {
    const procesedSchema = getRequiredPropertiesSchema({});
    expect(procesedSchema).toMatchObject({});
  });
});
