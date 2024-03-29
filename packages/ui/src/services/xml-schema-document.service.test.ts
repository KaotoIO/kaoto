import { XmlSchemaDocumentService, XmlSchemaField } from './xml-schema-document.service';
import * as fs from 'fs';
import { DocumentType } from '../models';

describe('XmlSchemaDocumentService', () => {
  const orderXsd = fs.readFileSync(__dirname + '/../../../../test-resources/ShipOrder.xsd').toString();

  it('should parse the xml schema', () => {
    const document = XmlSchemaDocumentService.parseXmlSchema(orderXsd);
    expect(document).toBeDefined();
    const shipOrder = XmlSchemaDocumentService.getFirstElement(document.xmlSchema);
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(document, fields, shipOrder);
    expect(fields.length > 0).toBeTruthy();
  });

  it('should create XML Schema Document', () => {
    const doc = XmlSchemaDocumentService.createXmlSchemaDocument(DocumentType.SOURCE_BODY, 'ShipOrder.xsd', orderXsd);
    expect(doc.documentType).toEqual(DocumentType.SOURCE_BODY);
    expect(doc.documentId).toEqual('ShipOrder.xsd');
    expect(doc.name).toEqual('ShipOrder.xsd');
    expect(doc.fields.length).toEqual(1);
  });
});
