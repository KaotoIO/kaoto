import { render } from '@testing-library/react';
import { SchemaBridgeProvider } from './schema-bridge.provider';
import { KaotoSchemaDefinition } from '../models';
import { SchemaService } from '../components/Form/schema.service';

describe('SchemaBridgeProvider', () => {
  const schema: KaotoSchemaDefinition['schema'] = {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
  };

  it('should use SchemaService to create a bridge', () => {
    const schemaServiceSpy = jest.spyOn(SchemaService.prototype, 'getSchemaBridge');
    const result = render(<SchemaBridgeProvider schema={schema} />);

    expect(result).not.toBe(null);
    expect(schemaServiceSpy).toHaveBeenCalledWith(schema);
  });
});
