import { csvDataFormatSchema } from '../../stubs/csv.dataformat';
import { errorHandlerSchema } from '../../stubs/error-handler';
import { SchemaBridge } from './schema-bridge';

describe('SchemaBridge', () => {
  let schemaBridge: SchemaBridge;

  it('error handler - should return `refErrorHandler` field', () => {
    schemaBridge = new SchemaBridge({ validator: () => null, schema: errorHandlerSchema });
    schemaBridge.getSubfields();
    Object.keys(errorHandlerSchema.properties!).forEach((key) => {
      schemaBridge.getSubfields(key);
    });

    const field = schemaBridge.getField('refErrorHandler');
    expect(field).toEqual({
      description: 'References to an existing or custom error handler.',
      oneOf: [
        { type: 'string' },
        {
          additionalProperties: false,
          properties: {
            id: { description: 'The id of this node', title: 'Id', type: 'string' },
            ref: { description: 'References to an existing or custom error handler.', title: 'Ref', type: 'string' },
          },
          type: 'object',
        },
      ],
      required: ['ref'],
      title: 'Ref Error Handler',
    });
  });

  describe('dataformat', () => {
    it('should return `header` field', () => {
      schemaBridge = new SchemaBridge({ validator: () => null, schema: csvDataFormatSchema });
      schemaBridge.getSubfields();
      Object.keys(csvDataFormatSchema.properties!).forEach((key) => {
        schemaBridge.getSubfields(key);
      });

      const field = schemaBridge.getField('header');
      expect(field).toEqual({
        description: 'To configure the CSV headers',
        items: {
          type: 'string',
        },
        title: 'Header',
        type: 'array',
      });
    });

    it('should return `header` initial value', () => {
      schemaBridge = new SchemaBridge({ validator: () => null, schema: csvDataFormatSchema });
      schemaBridge.getSubfields();
      Object.keys(csvDataFormatSchema.properties!).forEach((key) => {
        schemaBridge.getSubfields(key);
      });

      const field = schemaBridge.getInitialValue('header');
      expect(field).toEqual([]);
    });
  });
});
