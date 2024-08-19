import { XmlSchemaDocumentService, XmlSchemaField } from './xml-schema-document.service';
import { BODY_DOCUMENT_ID } from '../models/document';
import { DocumentType } from '../models/path';
import { Types } from '../models/types';
import { TestUtil } from '../test/test-util';

describe('XmlSchemaDocumentService', () => {
  it('should parse ShipOrder XML schema', () => {
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      TestUtil.orderXsd,
    );
    expect(document).toBeDefined();
    const shipOrder = XmlSchemaDocumentService.getFirstElement(document.xmlSchema);
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(document, fields, shipOrder);
    expect(fields.length > 0).toBeTruthy();
    expect(fields[0].name).toEqual('ShipOrder');
    expect(fields[0].fields[3].name).toEqual('Item');
    const itemTitleField = fields[0].fields[3].fields[0];
    expect(itemTitleField.name).toEqual('Title');
    expect(itemTitleField.type).not.toEqual(Types.Container);
  });

  it('should parse TestDocument XML schema', () => {
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.TARGET_BODY,
      BODY_DOCUMENT_ID,
      TestUtil.testXsd,
    );
    expect(document).toBeDefined();
    const testDoc = XmlSchemaDocumentService.getFirstElement(document.xmlSchema);
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(document, fields, testDoc);
    expect(fields.length > 0).toBeTruthy();
  });

  it('should create XML Schema Document', () => {
    const doc = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      'ShipOrder.xsd',
      TestUtil.orderXsd,
    );
    expect(doc.documentType).toEqual(DocumentType.SOURCE_BODY);
    expect(doc.documentId).toEqual('ShipOrder.xsd');
    expect(doc.name).toEqual('ShipOrder.xsd');
    expect(doc.fields.length).toEqual(1);
  });
});
