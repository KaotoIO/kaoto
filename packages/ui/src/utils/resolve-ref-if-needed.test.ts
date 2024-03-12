import { KaotoSchemaDefinition } from '../models';
import { resolveRefIfNeeded } from './resolve-ref-if-needed';

describe('resolveRefIfNeeded', () => {
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
    const result = resolveRefIfNeeded({ $ref: '#/definitions/name' }, schema);

    expect(result).toEqual({ type: 'string' });
  });

  it('should not modify the original schema', () => {
    const originalSchema = JSON.parse(JSON.stringify(schema));

    resolveRefIfNeeded({ $ref: '#/definitions/name' }, schema);

    expect(schema).toEqual(originalSchema);
  });

  it('should not modify the original value', () => {
    const originalValue = { $ref: '#/definitions/name' };

    resolveRefIfNeeded(originalValue, schema);

    expect(originalValue).toEqual({ $ref: '#/definitions/name' });
  });
});
