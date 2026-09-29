import { KaotoSchemaDefinition } from '../models';
import { errorHandlerSchema } from '../stubs/error-handler';
import { getOneOfSchemaList } from './get-oneof-schema-list';

describe('getOneOfSchemaList', () => {
  it('should return a list of `OneOfSchemas`', () => {
    const oneOfList: JSONSchema4[] = [
      { type: 'object', properties: { deadLetterChannel: { type: 'number' } } },
      { type: 'object', properties: { errorHandler: { type: 'string' } } },
    ];

    const result = getOneOfSchemaList(oneOfList);

    expect(result).toEqual([
      {
        name: 'Dead Letter Channel',
        schema: { type: 'object', properties: { deadLetterChannel: { type: 'number' } } },
      },
      { name: 'Error Handler', schema: { type: 'object', properties: { errorHandler: { type: 'string' } } } },
    ]);
  });

  it('should use the title from the schema if provided', () => {
    const oneOfList: JSONSchema4[] = [
      { type: 'object', title: 'Dead Letter Channel', properties: { deadLetterChannel: { type: 'number' } } },
      { type: 'object', title: 'Error Handler', properties: { errorHandler: { type: 'string' } } },
    ];

    const result = getOneOfSchemaList(oneOfList);

    expect(result).toEqual([
      {
        name: 'Dead Letter Channel',
        schema: { type: 'object', title: 'Dead Letter Channel', properties: { deadLetterChannel: { type: 'number' } } },
      },
      {
        name: 'Error Handler',
        schema: { type: 'object', title: 'Error Handler', properties: { errorHandler: { type: 'string' } } },
      },
    ]);
  });

  it('should use the description from the schema if provided', () => {
    const oneOfList: JSONSchema4[] = [
      {
        type: 'object',
        description: 'Dead Letter Channel handler',
        properties: { deadLetterChannel: { type: 'number' } },
      },
      { type: 'object', description: 'Error Handler', properties: { errorHandler: { type: 'string' } } },
    ];

    const result = getOneOfSchemaList(oneOfList);

    expect(result).toEqual([
      {
        name: 'Dead Letter Channel',
        title: undefined,
        description: 'Dead Letter Channel handler',
        schema: {
          type: 'object',
          description: 'Dead Letter Channel handler',
          properties: { deadLetterChannel: { type: 'number' } },
        },
      },
      {
        name: 'Error Handler',
        title: undefined,
        description: 'Error Handler',
        schema: { type: 'object', description: 'Error Handler', properties: { errorHandler: { type: 'string' } } },
      },
    ]);
  });

  it('should use the schema title and description when there is a single property schema', () => {
    const result = getOneOfSchemaList(errorHandlerSchema.oneOf!, errorHandlerSchema.definitions);

    expect(result).toEqual([
      {
        name: 'Dead Letter Channel',
        description: 'Error handler with dead letter queue.',
        schema: expect.any(Object),
      },
      {
        name: 'Default Error Handler',
        description: 'The default error handler.',
        schema: expect.any(Object),
      },
      {
        name: 'Jta Transaction Error Handler',
        description: 'JTA based transactional error handler (requires camel-jta).',
        schema: expect.any(Object),
      },
      {
        name: 'No Error Handler',
        description: 'To not use an error handler.',
        schema: expect.any(Object),
      },
      {
        name: 'Ref Error Handler',
        description: 'References to an existing or custom error handler.',
        schema: expect.any(Object),
      },
      {
        name: 'Spring Transaction Error Handler',
        description: 'Spring based transactional error handler (requires camel-spring).',
        schema: expect.any(Object),
      },
    ]);
  });

  it('should remove the `not` schemas', () => {
    const oneOfList: JSONSchema4[] = [
      { type: 'object', properties: { deadLetterChannel: { type: 'number' } } },
      { not: { type: 'object' } },
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'object', properties: { errorHandler: { type: 'string' } } },
    ];

    const result = getOneOfSchemaList(oneOfList);

    expect(result).toEqual([
      {
        name: 'Dead Letter Channel',
        description: undefined,
        schema: { type: 'object', properties: { deadLetterChannel: { type: 'number' } } },
      },
      {
        name: 'Schema 1',
        description: undefined,
        schema: { type: 'string' },
      },
      {
        name: 'Schema 2',
        description: undefined,
        schema: { type: 'number' },
      },
      {
        name: 'Schema 3',
        description: undefined,
        schema: { type: 'boolean' },
      },
      {
        name: 'Error Handler',
        description: undefined,
        schema: { type: 'object', properties: { errorHandler: { type: 'string' } } },
      },
    ]);
  });

  it('should use the property name if there is no title or description and there is single property', () => {
    const oneOfList: JSONSchema4[] = [
      { type: 'object', properties: { deadLetterChannel: { type: 'number' } } },
      { type: 'object', properties: { errorHandler: { type: 'string' } } },
    ];

    const result = getOneOfSchemaList(oneOfList);

    expect(result).toEqual([
      {
        name: 'Dead Letter Channel',
        description: undefined,
        schema: {
          type: 'object',
          properties: { deadLetterChannel: { type: 'number' } },
        },
      },
      {
        name: 'Error Handler',
        description: undefined,
        schema: {
          type: 'object',
          properties: { errorHandler: { type: 'string' } },
        },
      },
    ]);
  });

  it('should use generic names if there is no title or description and there are more than one property', () => {
    const oneOfList: JSONSchema4[] = [
      { type: 'object', properties: { deadLetterChannel: { type: 'number' }, anotherProperty: { type: 'string' } } },
      { type: 'object', properties: { errorHandler: { type: 'string' }, anotherProperty: { type: 'string' } } },
    ];

    const result = getOneOfSchemaList(oneOfList);

    expect(result).toEqual([
      {
        name: 'Schema 0',
        description: undefined,
        schema: {
          type: 'object',
          properties: { deadLetterChannel: { type: 'number' }, anotherProperty: { type: 'string' } },
        },
      },
      {
        name: 'Schema 1',
        description: undefined,
        schema: {
          type: 'object',
          properties: { errorHandler: { type: 'string' }, anotherProperty: { type: 'string' } },
        },
      },
    ]);
  });

  it('should update schema titles in case of Language or Dataformat could be represented in 2 different ways', () => {
    const oneOfList: JSONSchema4[] = [
      { type: 'string' },
      { type: 'object', properties: { errorHandler: { type: 'string' } } },
    ];

    const result = getOneOfSchemaList(oneOfList);

    expect(result).toEqual([
      {
        name: 'Simple',
        description: undefined,
        schema: { type: 'string' },
      },
      {
        name: 'Advanced',
        description: undefined,
        schema: {
          type: 'object',
          properties: { errorHandler: { type: 'string' } },
        },
      },
    ]);
  });
});
