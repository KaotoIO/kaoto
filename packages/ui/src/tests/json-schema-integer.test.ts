import { JsonSchemaDocumentService, JsonSchemaField } from '../services/json-schema-document.service';
import { DocumentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper';

describe('JsonSchemaDocumentService integer vs number', () => {
  it('maps integer to Types.Integer and number to Types.Numeric', () => {
    const schema = `{
      "type": "object",
      "properties": {
        "Quantity": { "type": "integer" },
        "Price": { "type": "number" }
      }
    }`;

    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.PARAM,
      'TestDoc',
      schema
    );

    const root: JsonSchemaField = doc.fields[0] as JsonSchemaField;
    const quantity = root.fields.find((f: JsonSchemaField) => f.key === 'Quantity');
    const price = root.fields.find((f: JsonSchemaField) => f.key === 'Price');

    expect(quantity).toBeTruthy();
    expect(price).toBeTruthy();

    expect(quantity!.type).toBe(Types.Integer);
    expect(quantity!.name).toBe('number');

    expect(price!.type).toBe(Types.Numeric);
    expect(price!.name).toBe('number');
  });
});
