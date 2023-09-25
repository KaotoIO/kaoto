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
});
