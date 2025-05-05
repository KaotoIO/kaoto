import { KaotoSchemaDefinition } from '../models';
import { resolveSchemaWithRef } from './resolve-schema-with-ref';

describe('resolveSchemaWithRef', () => {
  const schema: KaotoSchemaDefinition['schema'] = {
    type: 'object',
    properties: {
      name: {
        $ref: '#/definitions/name',
      },
    },
    definitions: {
      name: {
        type: 'string',
      },
    },
  };

  it('should resolve the value if it is a function', () => {
    const result = resolveSchemaWithRef({ $ref: '#/definitions/name' }, schema.definitions!);

    expect(result).toEqual({ type: 'string' });
  });

  it('should not modify the original schema', () => {
    const originalSchema = JSON.parse(JSON.stringify(schema));

    resolveSchemaWithRef({ $ref: '#/definitions/name' }, schema.definitions!);

    expect(schema).toEqual(originalSchema);
  });

  it('should not modify the original value', () => {
    const originalValue = { $ref: '#/definitions/name' };

    resolveSchemaWithRef(originalValue, schema.definitions!);

    expect(originalValue).toEqual({ $ref: '#/definitions/name' });
  });
});
