import { KaotoSchemaDefinition } from '../models';
import { errorHandlerSchema } from '../stubs/error-handler';
import { getResolvedSchema } from './get-resolved-schema';

describe('getResolvedSchema', () => {
  it('should return the same schema if it does not have properties', () => {
    const schema = { type: 'object' } as KaotoSchemaDefinition['schema'];
    const result = getResolvedSchema(schema, errorHandlerSchema);

    expect(result).toEqual(schema);
  });

  it('should return the same schema if there is no root schema', () => {
    const schema = { type: 'object' } as KaotoSchemaDefinition['schema'];
    const result = getResolvedSchema(schema);

    expect(result).toEqual(schema);
  });

  it('should ignore already resolved properties', () => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        deadLetterChannel: { type: 'number' },
      },
    };

    const result = getResolvedSchema(schema, errorHandlerSchema);

    expect(result).toEqual(schema);
  });

  it('should resolve a single-property schema', () => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      required: ['noErrorHandler'],
      properties: {
        noErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.NoErrorHandlerDefinition',
        },
      },
    };

    const result = getResolvedSchema(schema, errorHandlerSchema);

    expect(result).toEqual({
      type: 'object',
      required: ['noErrorHandler'],
      properties: {
        noErrorHandler: {
          additionalProperties: false,
          description: 'To not use an error handler.',
          properties: {
            id: {
              description: 'The id of this node',
              title: 'Id',
              type: 'string',
            },
          },
          title: 'No Error Handler',
          type: 'object',
        },
      },
    });
  });

  it('should resolve the properties of the schema', () => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      required: ['noErrorHandler'],
      properties: {
        noErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.NoErrorHandlerDefinition',
        },
        anotherErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.NoErrorHandlerDefinition',
        },
      },
    };

    const result = getResolvedSchema(schema, errorHandlerSchema);

    expect(result).toEqual({
      type: 'object',
      required: ['noErrorHandler'],
      properties: {
        noErrorHandler: {
          additionalProperties: false,
          description: 'To not use an error handler.',
          properties: {
            id: {
              description: 'The id of this node',
              title: 'Id',
              type: 'string',
            },
          },
          title: 'No Error Handler',
          type: 'object',
        },
        anotherErrorHandler: {
          additionalProperties: false,
          description: 'To not use an error handler.',
          properties: {
            id: {
              description: 'The id of this node',
              title: 'Id',
              type: 'string',
            },
          },
          title: 'No Error Handler',
          type: 'object',
        },
      },
    });
  });

  it('should no modify the original schema', () => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      required: ['noErrorHandler'],
      properties: {
        noErrorHandler: {
          $ref: '#/definitions/org.apache.camel.model.errorhandler.NoErrorHandlerDefinition',
        },
      },
    };

    const result = getResolvedSchema(schema, errorHandlerSchema);

    expect(result).not.toBe(schema);
  });
});
