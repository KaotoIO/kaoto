import { CamelSchemasProcessor } from './camel-schemas-processor';
import userSchemaJson from '../stubs/user-schema.json';

describe('camel-schemas-processor', () => {
  const camelSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'array',
    items: {
      definitions: {
        route: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
          },
        },
      },
      properties: {
        route: { $ref: '#/definitions/route' },
      },
    },
  };

  const schemas = [
    {
      name: 'user-schema',
      version: '3.2.0',
      tags: [],
      schema: userSchemaJson,
    },
  ];

  it.each([
    [null, false],
    [undefined, false],
    [{}, false],
    [{ schema: null }, false],
    [{ schema: {} }, false],
    [{ schema: { items: {} } }, true],
  ])('should return whether or not the provided schema is a Camel YAML schema: %s', (schema, expected) => {
    const result = CamelSchemasProcessor.isCamelCatalog(schema);

    expect(result).toEqual(expected);
  });

  it('should return a list of schemas', () => {
    const result = CamelSchemasProcessor.getSchemas(schemas);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('user-schema');
    expect(result[0].version).toEqual('3.2.0');
    expect(result[0].tags).toEqual([]);
    expect(result[0].schema).toEqual(userSchemaJson);
  });

  it.each([
    [
      'Beans',
      { ...schemas[0], schema: { ...camelSchema, items: { ...camelSchema.items, properties: { beans: {} } } } },
      [],
    ],
    ['userSchema', { ...schemas[0], schema: userSchemaJson }, []],
    ['Route', { ...schemas[0], schema: camelSchema }, ['visualization']],
    ['Integration', { ...schemas[0], name: 'Integration' }, ['visualization']],
    ['Kamelet', { ...schemas[0], name: 'Kamelet' }, ['visualization']],
    ['KameletBinding', { ...schemas[0], name: 'KameletBinding' }, ['visualization']],
    ['Pipe', { ...schemas[0], name: 'Pipe' }, ['visualization']],
  ])('should return a list of schemas with a tag property for: %s', (_name, schema, tags) => {
    const result = CamelSchemasProcessor.getSchemas([schema]);

    expect(result[0].tags).toEqual(tags);
  });
});
