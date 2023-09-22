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
      uri: 'https://camel.apache.org/schema/user-schema.json',
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
    [{ schema: { items: {} } }, false],
    [{ name: "Camel YAML DSL JSON schema" }, true],
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
    expect(result[0].uri).toEqual('https://camel.apache.org/schema/user-schema.json');
    expect(result[0].schema).toEqual(userSchemaJson);
  });

  it('should return a list of schemas for camel schemas', () => {
    const result = CamelSchemasProcessor.getSchemas([{ ...schemas[0], name: "Camel YAML DSL JSON schema", schema: camelSchema }]);
    const expected = [
      {
        name: 'Camel YAML DSL JSON schema',
        schema: {
          $schema: 'http://json-schema.org/draft-07/schema#',
          items: {
            definitions: {
              route: {
                properties: {
                  id: {
                    type: 'string',
                  },
                },
                type: 'object',
              },
            },
            properties: {
              route: {
                $ref: '#/definitions/route',
              },
            },
          },
          type: 'array',
        },
        tags: [],
        uri: 'https://camel.apache.org/schema/user-schema.json',
        version: '3.2.0',
      },
      {
        name: 'route',
        version: '3.2.0',
        tags: ['visualization'],
        uri: 'https://camel.apache.org/schema/user-schema.json',
        schema: {
          $schema: 'https://json-schema.org/draft-04/schema#',
          type: 'object',
          items: { definitions: camelSchema.items.definitions },
          properties: {
            route: camelSchema.items.properties.route,
          },
        },
      },
    ];

    expect(result).toEqual(expected);
  });

  it.each([
    [
      'Beans',
      { ...schemas[0], schema: { ...camelSchema, items: { ...camelSchema.items, properties: { beans: {} } } } },
      [],
    ],
    ['userSchema', { ...schemas[0], schema: userSchemaJson }, []],
    ['Route', { ...schemas[0], name: 'route', schema: camelSchema }, ['visualization']],
    ['Integration', { ...schemas[0], name: 'Integration' }, ['visualization']],
    ['Kamelet', { ...schemas[0], name: 'Kamelet' }, ['visualization']],
    ['KameletBinding', { ...schemas[0], name: 'KameletBinding' }, ['visualization']],
    ['Pipe', { ...schemas[0], name: 'Pipe' }, ['visualization']],
  ])('should return a list of schemas with a tag property for: %s', (_name, schema, tags) => {
    const result = CamelSchemasProcessor.getSchemas([schema]);

    expect(result[0].tags).toEqual(tags);
  });
});
