import { XmlSchemaDocumentService, XmlSchemaField } from './xml-schema-document.service';
import * as fs from 'fs';

describe('XmlSchemaDocumentService', () => {
  const orderXsd = fs.readFileSync(__dirname + '/../../../../test-resources/ShipOrder.xsd').toString();

  it('should parse the xml schema', () => {
    const document = XmlSchemaDocumentService.parseXmlSchema(orderXsd);
    expect(document).toBeDefined();
    const shipOrder = XmlSchemaDocumentService.getFirstElement(document.xmlSchema);
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(fields, shipOrder);
    expect(fields.length > 0).toBeTruthy();
  });
});
