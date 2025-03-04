import { KaotoSchemaDefinition } from '../models';
import { getItemFromSchema } from './get-item-from-schema';

describe('getItemFromSchema', () => {
  it('should return default value if schema is string', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', default: 'default value' };
    const definitions = {};

    const result = getItemFromSchema(schema, definitions);

    expect(result).toBe('default value');
  });

  it('should return default value if schema is boolean', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'boolean', default: true };
    const definitions = {};

    const result = getItemFromSchema(schema, definitions);

    expect(result).toBe(true);
  });

  it('should return default value if schema is number', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'number', default: 10 };
    const definitions = {};

    const result = getItemFromSchema(schema, definitions);

    expect(result).toBe(10);
  });

  it('should return object with default values if schema is object', () => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        name: { type: 'string', default: 'default name' },
        age: { type: 'number', default: 20 },
      },
      required: ['name'],
    };
    const definitions = {};

    const result = getItemFromSchema(schema, definitions);

    expect(result).toEqual({ name: 'default name' });
  });

  it('should return object with default values ignoring nested required properties', () => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      properties: {
        name: { type: 'string', default: 'default name' },
        age: { type: 'number', default: 20 },
        address: {
          type: 'object',
          properties: {
            city: { type: 'string', default: 'default city' },
            zip: { type: 'number', default: 12345 },
          },
          required: ['city'],
        },
      },
      required: ['name'],
    };
    const definitions = {};

    const result = getItemFromSchema(schema, definitions);

    expect(result).toEqual({
      name: 'default name',
    });
  });

  it('should return empty object if schema type is not string, boolean, number or object', () => {
    const schema: KaotoSchemaDefinition['schema'] = { allOf: [{ type: 'string' }] };
    const definitions = {};

    const result = getItemFromSchema(schema, definitions);

    expect(result).toEqual({});
  });
});
