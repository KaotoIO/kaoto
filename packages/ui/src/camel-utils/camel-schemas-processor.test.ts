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

  const schemas = {
    'userSchema':
        {
          name: 'userSchema',
          version: '3.2.0',
          uri: 'https://camel.apache.org/schema/user-schema.json',
          tags: [],
          schema: userSchemaJson,
        }
  };

  it('should return a map of schemas', () => {
    const result = CamelSchemasProcessor.getSchemas(schemas);

    expect(Object.keys(result)).toHaveLength(1);
    expect(result.userSchema.name).toEqual('userSchema');
    expect(result.userSchema.version).toEqual('3.2.0');
    expect(result.userSchema.tags).toEqual([]);
    expect(result.userSchema.uri).toEqual('https://camel.apache.org/schema/user-schema.json');
    expect(result.userSchema.schema).toEqual(userSchemaJson);
  });

  it('should return a list of schemas for camel schemas', () => {
    const result = CamelSchemasProcessor.getSchemas(
      {
        'userSchema' :
          {
            ...schemas.userSchema,
            name: "Camel YAML DSL JSON schema",
            schema: camelSchema
          }
      }
    );
    const expected = {
      'userSchema': {
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
    };

    expect(result).toEqual(expected);
  });

  it.each([
    [
      'Beans',
      { ...schemas.userSchema, schema: { ...camelSchema, items: { ...camelSchema.items, properties: { beans: {} } } } },
      [],
    ],
    ['userSchema', { ...schemas.userSchema, schema: userSchemaJson }, []],
    ['Route', { ...schemas.userSchema, name: 'route', schema: camelSchema }, ['visualization']],
    ['Integration', { ...schemas.userSchema, name: 'Integration' }, ['visualization']],
    ['Kamelet', { ...schemas.userSchema, name: 'Kamelet' }, ['visualization']],
    ['KameletBinding', { ...schemas.userSchema, name: 'KameletBinding' }, ['visualization']],
    ['Pipe', { ...schemas.userSchema, name: 'Pipe' }, ['visualization']],
  ])('should return a list of schemas with a tag property for: %s', (_name, schema, tags) => {
    const result = CamelSchemasProcessor.getSchemas({name: schema});

    expect(result.name.tags).toEqual(tags);
  });
});
