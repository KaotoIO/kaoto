import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../../models/datamapper/document';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

describe('XmlSchemaDocumentService / repeated abstract element refs', () => {
  it('should create a unique wrapper with its own cardinality for each abstract element ref', () => {
    const xsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           xmlns:tns="http://example.com/vehicles"
           targetNamespace="http://example.com/vehicles"
           elementFormDefault="qualified">
  <xs:element name="Root">
    <xs:complexType>
      <xs:sequence>
        <xs:element ref="tns:AbstractVehicle"/>
        <xs:element ref="tns:AbstractVehicle" maxOccurs="unbounded"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
  <xs:element name="AbstractVehicle" type="xs:string" abstract="true"/>
  <xs:element name="Car" type="xs:string" substitutionGroup="tns:AbstractVehicle"/>
</xs:schema>`;
    const definition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'vehicles.xsd': xsd },
      { namespaceUri: 'http://example.com/vehicles', name: 'Root' },
    );

    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);

    expect(result.validationStatus).toBe('success');
    const document = result.document as XmlSchemaDocument;
    const abstractFields = document.fields[0].fields.filter((field) => field.wrapperKind === 'abstract');
    expect(abstractFields).toHaveLength(2);
    expect(new Set(abstractFields.map((field) => field.name)).size).toBe(2);
    expect(abstractFields.map((field) => field.displayName)).toEqual(['AbstractVehicle', 'AbstractVehicle']);
    expect(abstractFields.map((field) => field.minOccurs)).toEqual([1, 1]);
    expect(abstractFields.map((field) => field.maxOccurs)).toEqual([1, 'unbounded']);
  });
});
