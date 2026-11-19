import { JSONSchema4 } from 'json-schema';

import { weightSchemaAgainstModel } from './weight-schemas-against-model';

describe('weightSchemaAgainstModel', () => {
  const definitions: Record<string, JSONSchema4> = {
    expression: { type: 'object', properties: { language: { type: 'string' } } },
  };

  it.each<[string, unknown, JSONSchema4, number]>([
    ['no model', undefined, { type: 'string' }, 0],
    ['a string for a string schema', 'text', { type: 'string' }, 10],
    ['a number for a string schema', 42, { type: 'string' }, 0],
    ['a boolean for a boolean schema', true, { type: 'boolean' }, 10],
    ['an empty object for an object schema', {}, { type: 'object' }, 10],
  ])('weights %s as %i', (_, model, schema, points) => {
    expect(weightSchemaAgainstModel(model, schema, definitions)).toBe(points);
  });

  it('gives a point for a known property and ten more when its type matches', () => {
    const schema: JSONSchema4 = { type: 'object', properties: { id: { type: 'string' }, count: { type: 'number' } } };

    expect(weightSchemaAgainstModel({ id: 'route-1' }, schema, definitions)).toBe(11);
    expect(weightSchemaAgainstModel({ id: 42 }, schema, definitions)).toBe(1);
    expect(weightSchemaAgainstModel({ unknown: 'x' }, schema, definitions)).toBe(0);
  });

  it('weights a nested object against the schema of its property, also through a reference', () => {
    const schema: JSONSchema4 = { type: 'object', properties: { expression: { $ref: '#/definitions/expression' } } };

    // 1 for the known property, 10 for its object type, 11 for its matching nested property
    expect(weightSchemaAgainstModel({ expression: { language: 'simple' } }, schema, definitions)).toBe(22);
  });

  it.each<[string, JSONSchema4]>([
    ['anyOf', { anyOf: [{ type: 'object', properties: { uri: { type: 'string' } } }] }],
    ['oneOf', { oneOf: [{ type: 'object', properties: { uri: { type: 'string' } } }] }],
  ])('adds the weight of the %s schemas', (_, schema) => {
    expect(weightSchemaAgainstModel({ uri: 'timer:tick' }, schema, definitions)).toBe(11);
  });

  it('weights a model that fits none of the alternatives as 0', () => {
    const schema: JSONSchema4 = { oneOf: [{ type: 'object', properties: { uri: { type: 'string' } } }] };

    expect(weightSchemaAgainstModel({ name: 'x' }, schema, definitions)).toBe(0);
  });
});
