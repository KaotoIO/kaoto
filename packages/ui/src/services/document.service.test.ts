import { DocumentService } from './document.service';

import { TestUtil } from '../stubs/datamapper/data-mapper';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PathSegment,
  PrimitiveDocument,
} from '../models/datamapper';
import { XmlSchemaDocument } from './xml-schema-document.service';
import { JsonSchemaDocument } from './json-schema-document.service';

describe('DocumentService', () => {
  const sourceDoc = TestUtil.createSourceOrderDoc();
  const targetDoc = TestUtil.createTargetOrderDoc();
  const namespaces = { kaoto: 'io.kaoto.datamapper.poc.test' };

  describe('createDocument()', () => {
    it('should create a primitive document', () => {
      const docDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test', {});
      const doc = DocumentService.createDocument(docDef);
      expect(doc instanceof PrimitiveDocument).toBeTruthy();
    });

    it('should create a XML schema document', () => {
      const docDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test', {
        schema: `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:string" />
                 </xs:schema>`,
      });
      const doc = DocumentService.createDocument(docDef);
      expect(doc instanceof XmlSchemaDocument).toBeTruthy();
    });

    it('should throw an error if XML schema is not parseable', () => {
      const docDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test', {
        schema: JSON.stringify({ type: 'string' }),
      });
      expect(() => DocumentService.createDocument(docDef)).toThrow();
    });

    it('should create a JSON schema document', () => {
      const docDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.JSON_SCHEMA, 'test', {
        schema: JSON.stringify({ type: 'string' }),
      });
      const doc = DocumentService.createDocument(docDef);
      expect(doc instanceof JsonSchemaDocument).toBeTruthy();
    });

    it('should throw an error if JSON schema is not parseable', () => {
      const docDef = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.JSON_SCHEMA, 'test', {
        schema: `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:string" />
                 </xs:schema>`,
      });
      expect(() => DocumentService.createDocument(docDef)).toThrow();
    });

    it('should return null if type is unknown', () => {
      const docDef = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        'unknown' as unknown as DocumentDefinitionType,
        'test',
        {
          schema: `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:string" />
                 </xs:schema>`,
        },
      );
      const doc = DocumentService.createDocument(docDef);
      expect(doc).toBeNull();
    });
  });

  describe('hasField()', () => {
    it('', () => {
      expect(DocumentService.hasField(sourceDoc, sourceDoc.fields[0].fields[0])).toBeTruthy();
      expect(DocumentService.hasField(sourceDoc, targetDoc.fields[0].fields[0])).toBeFalsy();
    });
  });

  describe('getFieldFromPathSegments()', () => {
    it('', () => {
      const pathSegments = [new PathSegment('ShipOrder', false, 'kaoto'), new PathSegment('ShipTo')];
      const field = DocumentService.getFieldFromPathSegments(namespaces, sourceDoc, pathSegments);
      expect(field?.name).toEqual('ShipTo');
    });
  });

  describe('isCollectionField()', () => {
    it('', () => {
      expect(DocumentService.isCollectionField(sourceDoc.fields[0])).toBeFalsy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0])).toBeFalsy();
      expect(DocumentService.isCollectionField(sourceDoc.fields[0].fields[0])).toBeFalsy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0].fields[0])).toBeFalsy();
      expect(DocumentService.isCollectionField(sourceDoc.fields[0].fields[1])).toBeFalsy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0].fields[1])).toBeFalsy();
      expect(DocumentService.isCollectionField(sourceDoc.fields[0].fields[2])).toBeFalsy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0].fields[2])).toBeFalsy();
      expect(DocumentService.isCollectionField(sourceDoc.fields[0].fields[3])).toBeTruthy();
      expect(DocumentService.isCollectionField(targetDoc.fields[0].fields[3])).toBeTruthy();
    });
  });
});
