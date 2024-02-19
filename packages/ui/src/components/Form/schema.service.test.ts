import { SchemaService } from './schema.service';

describe('SchemaService', () => {
  let schemaService: SchemaService;

  beforeEach(() => {
    schemaService = new SchemaService();
  });

  it('should return a schema bridge', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    };
    const schemaBridge = schemaService.getSchemaBridge(schema);

    expect(schemaBridge?.schema).toEqual(schema);
  });

  it('should return undefined if no schema is provided', () => {
    const schemaBridge = schemaService.getSchemaBridge();

    expect(schemaBridge).toBeUndefined();
  });

  it('should catch and notify an exception from the validator', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { $ref: 'invalid' },
      },
    };
    jest.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => schemaService.getSchemaBridge(schema)).not.toThrow();
  });

  it('should return null when there is no valid validator', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { $ref: 'invalid' },
      },
    };
    const schemaBridge = schemaService.getSchemaBridge(schema);
    const validator = schemaBridge?.validator;
    jest.spyOn(console, 'error').mockImplementation(() => null);
    expect(() => validator!({})).not.toThrow();
    expect(validator!({})).toBeNull();
  });
});
