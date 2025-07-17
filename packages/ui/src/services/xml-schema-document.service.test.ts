import { XmlSchemaDocumentService, XmlSchemaField } from './xml-schema-document.service';
import { BODY_DOCUMENT_ID, DocumentType } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import {
  camelSpringXsd,
  shipOrderXsd,
  shipOrderEmptyFirstLineXsd,
  testDocumentXsd,
} from '../stubs/datamapper/data-mapper';

describe('XmlSchemaDocumentService', () => {
  it('should parse ShipOrder XML schema', () => {
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      BODY_DOCUMENT_ID,
      shipOrderXsd,
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
      testDocumentXsd,
    );
    expect(document).toBeDefined();
    const testDoc = XmlSchemaDocumentService.getFirstElement(document.xmlSchema);
    const fields: XmlSchemaField[] = [];
    XmlSchemaDocumentService.populateElement(document, fields, testDoc);
    expect(fields.length > 0).toBeTruthy();
  });

  it('should parse camel-spring.xsd XML schema', () => {
    const document = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.TARGET_BODY,
      BODY_DOCUMENT_ID,
      camelSpringXsd,
    );
    expect(document).toBeDefined();
    expect(document.fields.length).toEqual(1);
    const aggregate = document.fields[0];
    expect(aggregate.fields.length).toBe(0);
    expect(aggregate.namedTypeFragmentRefs.length).toEqual(1);
    expect(aggregate.namedTypeFragmentRefs[0]).toEqual('{http://camel.apache.org/schema/spring}aggregateDefinition');
    const aggregateDef = document.namedTypeFragments[aggregate.namedTypeFragmentRefs[0]];
    expect(aggregateDef.fields.length).toEqual(100);
    expect(aggregateDef.namedTypeFragmentRefs[0]).toEqual('{http://camel.apache.org/schema/spring}output');
    const outputDef = document.namedTypeFragments[aggregateDef.namedTypeFragmentRefs[0]];
    expect(outputDef.fields.length).toEqual(0);
    expect(outputDef.namedTypeFragmentRefs[0]).toEqual('{http://camel.apache.org/schema/spring}processorDefinition');
    const processorDef = document.namedTypeFragments[outputDef.namedTypeFragmentRefs[0]];
    expect(processorDef.fields.length).toEqual(2);
    expect(processorDef.namedTypeFragmentRefs[0]).toEqual(
      '{http://camel.apache.org/schema/spring}optionalIdentifiedDefinition',
    );
    const optionalIdentifiedDef = document.namedTypeFragments[processorDef.namedTypeFragmentRefs[0]];
    expect(optionalIdentifiedDef.fields.length).toEqual(3);
    expect(optionalIdentifiedDef.namedTypeFragmentRefs.length).toEqual(0);
  });

  it('should create XML Schema Document', () => {
    const doc = XmlSchemaDocumentService.createXmlSchemaDocument(
      DocumentType.SOURCE_BODY,
      'ShipOrder.xsd',
      shipOrderXsd,
    );
    expect(doc.documentType).toEqual(DocumentType.SOURCE_BODY);
    expect(doc.documentId).toEqual('ShipOrder.xsd');
    expect(doc.name).toEqual('ShipOrder.xsd');
    expect(doc.fields.length).toEqual(1);
  });

  it('should throw an error if there is a parse error on the XML schema', () => {
    try {
      XmlSchemaDocumentService.createXmlSchemaDocument(
        DocumentType.SOURCE_BODY,
        'ShipOrderEmptyFirstLine.xsd',
        shipOrderEmptyFirstLineXsd,
      );
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    } catch (error: any) {
      expect(error.message).toContain('an XML declaration must be at the start of the document');
      return;
    }
    expect(true).toBeFalsy();
  });
});
