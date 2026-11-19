import { getAppliedSchemaIndex } from './get-applied-schema-index';
import { OneOfSchemas } from './get-oneof-schema-list';

describe('getAppliedSchemaIndex', () => {
  const oneOfSchemaList: OneOfSchemas[] = [
    { name: 'Name only', schema: { type: 'object', properties: { name: { type: 'string' } } } },
    {
      name: 'Name and port',
      schema: { type: 'object', properties: { name: { type: 'string' }, port: { type: 'number' } } },
    },
  ];

  it('picks the schema that fits the model best', () => {
    expect(getAppliedSchemaIndex({ name: 'db', port: 5432 }, oneOfSchemaList)).toBe(1);
  });

  it('keeps the first of equally fitting schemas', () => {
    expect(getAppliedSchemaIndex({ name: 'db' }, oneOfSchemaList)).toBe(0);
  });

  it.each([
    ['no model', undefined],
    ['a model that fits no schema', { host: 'localhost' }],
  ])('returns -1 for %s', (_, model) => {
    expect(getAppliedSchemaIndex(model, oneOfSchemaList)).toBe(-1);
  });
});
