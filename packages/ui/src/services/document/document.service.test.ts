import fs from 'node:fs';
import path from 'node:path';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IField,
  IParentType,
  PathSegment,
  PrimitiveDocument,
  RootElementOption,
  Types,
} from '../../models/datamapper';
import { IFieldSubstitution } from '../../models/datamapper/metadata';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import { PathExpression } from '../../models/datamapper/xpath';
import { IMetadataApi } from '../../providers';
import { getCartJsonSchema, getMultipleElementsXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { DocumentService } from './document.service';
import { JsonSchemaDocument } from './json-schema/json-schema-document.model';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema/xml-schema-document.model';

describe('DocumentService', () => {
  const sourceDoc = TestUtil.createSourceOrderDoc();
  const targetDoc = TestUtil.createTargetOrderDoc();
  const namespaces = { kaoto: 'io.kaoto.datamapper.poc.test' };

  describe('createDocument()', () => {
    it('should create a XML schema document', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:string" />
                 </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof XmlSchemaDocument).toBeTruthy();
      expect(result.documentDefinition).toBeDefined();
      expect(result.documentDefinition?.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.XML_SCHEMA);
      expect(result.rootElementOptions).toBeDefined();
      expect(result.rootElementOptions?.length).toEqual(1);
    });

    it('should create XML schema document with multiple root elements', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(getMultipleElementsXsd()),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'multiple',
        ['MultipleElements.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof XmlSchemaDocument).toBeTruthy();
      expect(result.rootElementOptions).toBeDefined();
      expect(result.rootElementOptions?.length).toBe(3);

      expect(result.rootElementOptions).toEqual([
        { name: 'Order', namespaceUri: 'io.kaoto.datamapper.test.multiple' },
        { name: 'Invoice', namespaceUri: 'io.kaoto.datamapper.test.multiple' },
        { name: 'Shipment', namespaceUri: 'io.kaoto.datamapper.test.multiple' },
      ]);
    });

    it('should return error if XML schema is not parseable', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(JSON.stringify({ type: 'string' })),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeDefined();
    });

    it('should create a JSON schema document', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(JSON.stringify({ type: 'string' })),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test',
        ['test.json'],
      );

      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof JsonSchemaDocument).toBeTruthy();
      expect(result.documentDefinition).toBeDefined();
      expect(result.documentDefinition?.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.JSON_SCHEMA);
    });

    it('should return error if JSON schema is not parseable', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:string" />
                 </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test',
        ['test.json'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeUndefined();
    });

    it('should return error if file content is empty', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(''),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.errors![0].message).toBe("There's no top level Element in the schema");
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeDefined();
    });
  });

  describe('createPrimitiveDocument()', () => {
    it('should create a primitive document', () => {
      const result = DocumentService.createPrimitiveDocument(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.Primitive,
        'test',
      );
      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof PrimitiveDocument).toBeTruthy();
      expect(result.document?.documentId).toEqual('test');
      expect(result.documentDefinition).toBeDefined();
      expect(result.documentDefinition?.documentType).toBe(DocumentType.SOURCE_BODY);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.Primitive);
      expect(result.documentDefinition?.name).toBe('test');
    });

    it('should create a primitive document for a param', () => {
      const result = DocumentService.createPrimitiveDocument(
        DocumentType.PARAM,
        DocumentDefinitionType.Primitive,
        'test',
      );
      expect(result.validationStatus).toBe('success');
      expect(result.document instanceof PrimitiveDocument).toBeTruthy();
      expect(result.document?.documentId).toEqual('test');
      expect(result.documentDefinition).toBeDefined();
      expect(result.documentDefinition?.documentType).toBe(DocumentType.PARAM);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.Primitive);
      expect(result.documentDefinition?.name).toBe('test');
    });
  });

  describe('hasField()', () => {
    it('', () => {
      expect(DocumentService.hasField(sourceDoc, sourceDoc.fields[0].fields[0])).toBeTruthy();
      expect(DocumentService.hasField(sourceDoc, targetDoc.fields[0].fields[0])).toBeFalsy();
    });

    it('should recognize a field nested inside a choice compositor as a descendant', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.wrapperKind = 'choice';
      const emailField = new XmlSchemaField(choiceField, 'email', false);
      choiceField.fields = [emailField];
      shipOrderField.fields.push(choiceField);

      expect(DocumentService.hasField(doc, emailField)).toBeTruthy();
    });
  });

  describe('getCompatibleField()', () => {
    it('should find a compatible field when the matching field is inside a choice compositor in the target document', () => {
      const srcDoc = TestUtil.createSourceOrderDoc();
      const tgtDoc = TestUtil.createTargetOrderDoc();
      const srcShipOrderField = srcDoc.fields[0];
      const srcEmailField = new XmlSchemaField(srcShipOrderField, 'email', false);
      srcShipOrderField.fields.push(srcEmailField);

      const tgtShipOrderField = tgtDoc.fields[0];
      const tgtChoiceField = new XmlSchemaField(tgtShipOrderField, 'choice', false);
      tgtChoiceField.wrapperKind = 'choice';
      const tgtEmailField = new XmlSchemaField(tgtChoiceField, 'email', false);
      tgtChoiceField.fields = [tgtEmailField];
      tgtShipOrderField.fields.push(tgtChoiceField);

      const result = DocumentService.getCompatibleField(tgtDoc, srcEmailField);

      expect(result?.name).toEqual('email');
    });

    it('should find a compatible field when the matching field is inside a nested choice compositor', () => {
      const srcDoc = TestUtil.createSourceOrderDoc();
      const tgtDoc = TestUtil.createTargetOrderDoc();
      const srcShipOrderField = srcDoc.fields[0];
      const srcTargetField = new XmlSchemaField(srcShipOrderField, 'payload', false);
      srcShipOrderField.fields.push(srcTargetField);

      const tgtShipOrderField = tgtDoc.fields[0];
      const outerChoice = new XmlSchemaField(tgtShipOrderField, 'choice', false);
      outerChoice.wrapperKind = 'choice';
      const innerChoice = new XmlSchemaField(outerChoice, 'choice', false);
      innerChoice.wrapperKind = 'choice';
      const tgtPayloadField = new XmlSchemaField(innerChoice, 'payload', false);
      innerChoice.fields = [tgtPayloadField];
      outerChoice.fields = [innerChoice];
      tgtShipOrderField.fields.push(outerChoice);

      const result = DocumentService.getCompatibleField(tgtDoc, srcTargetField);

      expect(result?.name).toEqual('payload');
    });

    it('should find email in the correct choice compositor when matched by positional index', () => {
      const srcDoc = TestUtil.createSourceOrderDoc();
      const tgtDoc = TestUtil.createTargetOrderDoc();

      const srcShipOrderField = srcDoc.fields[0];
      const srcChoice0 = new XmlSchemaField(srcShipOrderField, 'choice', false);
      srcChoice0.wrapperKind = 'choice';
      srcChoice0.fields = [new XmlSchemaField(srcChoice0, 'phone', false)];
      const srcChoice1 = new XmlSchemaField(srcShipOrderField, 'choice', false);
      srcChoice1.wrapperKind = 'choice';
      const srcEmailField = new XmlSchemaField(srcChoice1, 'email', false);
      srcChoice1.fields = [srcEmailField];
      srcShipOrderField.fields.push(srcChoice0, srcChoice1);

      const tgtShipOrderField = tgtDoc.fields[0];
      const tgtChoice0 = new XmlSchemaField(tgtShipOrderField, 'choice', false);
      tgtChoice0.wrapperKind = 'choice';
      tgtChoice0.fields = [new XmlSchemaField(tgtChoice0, 'phone', false)];
      const tgtChoice1 = new XmlSchemaField(tgtShipOrderField, 'choice', false);
      tgtChoice1.wrapperKind = 'choice';
      const tgtEmailField = new XmlSchemaField(tgtChoice1, 'email', false);
      tgtChoice1.fields = [tgtEmailField];
      tgtShipOrderField.fields.push(tgtChoice0, tgtChoice1);

      const result = DocumentService.getCompatibleField(tgtDoc, srcEmailField);

      expect(result?.name).toEqual('email');
    });

    it('should return undefined when the source choice index has no corresponding choice in the target', () => {
      const srcDoc = TestUtil.createSourceOrderDoc();
      const tgtDoc = TestUtil.createTargetOrderDoc();

      const srcShipOrderField = srcDoc.fields[0];
      const srcChoice0 = new XmlSchemaField(srcShipOrderField, 'choice', false);
      srcChoice0.wrapperKind = 'choice';
      srcChoice0.fields = [new XmlSchemaField(srcChoice0, 'phone', false)];
      const srcChoice1 = new XmlSchemaField(srcShipOrderField, 'choice', false);
      srcChoice1.wrapperKind = 'choice';
      const srcEmailField = new XmlSchemaField(srcChoice1, 'email', false);
      srcChoice1.fields = [srcEmailField];
      srcShipOrderField.fields.push(srcChoice0, srcChoice1);

      const tgtShipOrderField = tgtDoc.fields[0];
      const tgtChoice0 = new XmlSchemaField(tgtShipOrderField, 'choice', false);
      tgtChoice0.wrapperKind = 'choice';
      const tgtEmailField = new XmlSchemaField(tgtChoice0, 'email', false);
      tgtChoice0.fields = [tgtEmailField];
      tgtShipOrderField.fields.push(tgtChoice0);

      const result = DocumentService.getCompatibleField(tgtDoc, srcEmailField);

      expect(result).toBeUndefined();
    });
  });

  describe('getFieldFromPathSegments()', () => {
    it('', () => {
      const pathSegments = [new PathSegment('ShipOrder', false, 'kaoto'), new PathSegment('ShipTo')];
      const field = DocumentService.getFieldFromPathSegments(namespaces, sourceDoc, pathSegments);
      expect(field?.name).toEqual('ShipTo');
    });

    it('should find a field nested directly inside a choice compositor', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.wrapperKind = 'choice';
      const emailField = new XmlSchemaField(choiceField, 'email', false);
      choiceField.fields = [emailField];
      shipOrderField.fields.push(choiceField);

      const pathSegments = [new PathSegment('ShipOrder', false, 'kaoto'), new PathSegment('email')];
      const result = DocumentService.getFieldFromPathSegments(namespaces, doc, pathSegments);

      expect(result?.name).toEqual('email');
    });

    it('should find a field nested inside a nested choice compositor', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const outerChoice = new XmlSchemaField(shipOrderField, 'choice', false);
      outerChoice.wrapperKind = 'choice';
      const innerChoice = new XmlSchemaField(outerChoice, 'choice', false);
      innerChoice.wrapperKind = 'choice';
      const targetField = new XmlSchemaField(innerChoice, 'target', false);
      innerChoice.fields = [targetField];
      outerChoice.fields = [innerChoice];
      shipOrderField.fields.push(outerChoice);

      const pathSegments = [new PathSegment('ShipOrder', false, 'kaoto'), new PathSegment('target')];
      const result = DocumentService.getFieldFromPathSegments(namespaces, doc, pathSegments);

      expect(result?.name).toEqual('target');
    });

    it('should find a field nested directly inside an abstract wrapper', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const abstractField = new XmlSchemaField(shipOrderField, 'AbstractAnimal', false);
      abstractField.wrapperKind = 'abstract';
      const catField = new XmlSchemaField(abstractField, 'Cat', false);
      abstractField.fields = [catField];
      shipOrderField.fields.push(abstractField);

      const pathSegments = [new PathSegment('ShipOrder', false, 'kaoto'), new PathSegment('Cat')];
      const result = DocumentService.getFieldFromPathSegments(namespaces, doc, pathSegments);

      expect(result?.name).toEqual('Cat');
    });

    it('should find a field nested inside nested abstract wrappers', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const outerAbstract = new XmlSchemaField(shipOrderField, 'OuterAbstract', false);
      outerAbstract.wrapperKind = 'abstract';
      const innerAbstract = new XmlSchemaField(outerAbstract, 'InnerAbstract', false);
      innerAbstract.wrapperKind = 'abstract';
      const targetField = new XmlSchemaField(innerAbstract, 'target', false);
      innerAbstract.fields = [targetField];
      outerAbstract.fields = [innerAbstract];
      shipOrderField.fields.push(outerAbstract);

      const pathSegments = [new PathSegment('ShipOrder', false, 'kaoto'), new PathSegment('target')];
      const result = DocumentService.getFieldFromPathSegments(namespaces, doc, pathSegments);

      expect(result?.name).toEqual('target');
    });

    it('should find a field inside an abstract wrapper nested in a choice compositor', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.wrapperKind = 'choice';
      const abstractField = new XmlSchemaField(choiceField, 'AbstractAnimal', false);
      abstractField.wrapperKind = 'abstract';
      const catField = new XmlSchemaField(abstractField, 'Cat', false);
      abstractField.fields = [catField];
      choiceField.fields = [abstractField];
      shipOrderField.fields.push(choiceField);

      const pathSegments = [new PathSegment('ShipOrder', false, 'kaoto'), new PathSegment('Cat')];
      const result = DocumentService.getFieldFromPathSegments(namespaces, doc, pathSegments);

      expect(result?.name).toEqual('Cat');
    });

    it('should navigate through multiple levels of unresolved namedTypeFragmentRefs', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];

      const lazyField = new XmlSchemaField(shipOrderField, 'lazyField', false);
      const deepLazyChild = new XmlSchemaField(lazyField, 'deepLazyChild', false);
      const leafField = new XmlSchemaField(deepLazyChild, 'leafField', false);

      doc.namedTypeFragments['deepFragment'] = { namedTypeFragmentRefs: [], fields: [leafField] };
      deepLazyChild.namedTypeFragmentRefs.push('deepFragment');

      doc.namedTypeFragments['topFragment'] = { namedTypeFragmentRefs: [], fields: [deepLazyChild] };
      lazyField.namedTypeFragmentRefs.push('topFragment');

      shipOrderField.fields.push(lazyField);

      const pathSegments = [
        new PathSegment('ShipOrder', false, 'kaoto'),
        new PathSegment('lazyField'),
        new PathSegment('deepLazyChild'),
        new PathSegment('leafField'),
      ];
      const result = DocumentService.getFieldFromPathSegments(namespaces, doc, pathSegments);

      expect(result?.name).toEqual('leafField');
    });
  });

  describe('hasChildren()', () => {
    it('should return false for attributes even with namedTypeFragmentRefs', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:complexType name="TestType">
                     <xs:attribute name="testAttr" type="xs:string" />
                   </xs:complexType>
                   <xs:element name="test" type="TestType" />
                 </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const doc = result.document;
      expect(doc).toBeDefined();

      // Find an attribute field
      const findAttribute = (fields: IField[]): IField | null => {
        for (const field of fields) {
          if (field.isAttribute) return field;
          if (field.fields?.length > 0) {
            const found = findAttribute(field.fields);
            if (found) return found;
          }
        }
        return null;
      };

      const attributeField = findAttribute(doc?.fields || []);
      if (attributeField) {
        // Attributes should never have children, regardless of type references
        expect(DocumentService.hasChildren(attributeField)).toBeFalsy();
      }
    });

    it('should return true for elements with child fields', () => {
      // sourceDoc.fields[0] is ShipOrder element which has child fields
      expect(DocumentService.hasChildren(sourceDoc.fields[0])).toBeTruthy();
    });

    it('should return false for elements without children', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="simpleElement" type="xs:string" />
                 </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const doc = result.document;
      expect(doc).toBeDefined();

      if (doc && doc.fields.length > 0) {
        const simpleField = doc.fields[0];
        expect(DocumentService.hasChildren(simpleField)).toBeFalsy();
      }
    });
  });

  describe('isCollectionField()', () => {
    it('should identify collection fields by maxOccurs', () => {
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

    it('should identify members of collection choice as collection fields', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`
          <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="test" xmlns:ns0="test">
            <xs:element name="TestDocument">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="CollectionChoiceElement">
                    <xs:complexType>
                      <xs:choice maxOccurs="unbounded">
                        <xs:element name="Email" type="xs:string"/>
                        <xs:element name="Phone" type="xs:string"/>
                        <xs:element name="Fax" type="xs:string"/>
                      </xs:choice>
                    </xs:complexType>
                  </xs:element>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:schema>
        `),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const doc = result.document!;

      // Navigate to CollectionChoiceElement
      const collectionChoiceElement = doc.fields[0].fields[0];
      expect(collectionChoiceElement.name).toBe('CollectionChoiceElement');

      // The choice wrapper itself should be a collection
      const choiceWrapper = collectionChoiceElement.fields[0];
      expect(choiceWrapper.wrapperKind).toBe('choice');
      expect(DocumentService.isCollectionField(choiceWrapper)).toBeTruthy();

      // Each member of the collection choice should inherit collection status
      const emailField = choiceWrapper.fields.find((f) => f.name === 'Email');
      const phoneField = choiceWrapper.fields.find((f) => f.name === 'Phone');
      const faxField = choiceWrapper.fields.find((f) => f.name === 'Fax');

      expect(emailField).toBeDefined();
      expect(phoneField).toBeDefined();
      expect(faxField).toBeDefined();

      // Members themselves have maxOccurs=1, but should be treated as collections
      // because they're inside a collection choice wrapper
      expect(emailField!.maxOccurs).toBe(1);
      expect(DocumentService.isCollectionField(emailField!)).toBeTruthy();

      expect(phoneField!.maxOccurs).toBe(1);
      expect(DocumentService.isCollectionField(phoneField!)).toBeTruthy();

      expect(faxField!.maxOccurs).toBe(1);
      expect(DocumentService.isCollectionField(faxField!)).toBeTruthy();
    });

    it('should not treat members of non-collection choice as collection fields', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`
          <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="test" xmlns:ns0="test">
            <xs:element name="TestDocument">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="RegularChoiceElement">
                    <xs:complexType>
                      <xs:choice>
                        <xs:element name="Choice1" type="xs:string"/>
                        <xs:element name="Choice2" type="xs:string"/>
                      </xs:choice>
                    </xs:complexType>
                  </xs:element>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:schema>
        `),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const doc = result.document!;

      // Navigate to RegularChoiceElement
      const regularChoiceElement = doc.fields[0].fields[0];
      expect(regularChoiceElement.name).toBe('RegularChoiceElement');

      // The choice wrapper itself should NOT be a collection (maxOccurs=1)
      const choiceWrapper = regularChoiceElement.fields[0];
      expect(choiceWrapper.wrapperKind).toBe('choice');
      expect(DocumentService.isCollectionField(choiceWrapper)).toBeFalsy();

      // Members should NOT inherit collection status from non-collection choice
      const choice1Field = choiceWrapper.fields.find((f) => f.name === 'Choice1');
      const choice2Field = choiceWrapper.fields.find((f) => f.name === 'Choice2');

      expect(choice1Field).toBeDefined();
      expect(choice2Field).toBeDefined();

      expect(DocumentService.isCollectionField(choice1Field!)).toBeFalsy();
      expect(DocumentService.isCollectionField(choice2Field!)).toBeFalsy();
    });
  });

  describe('isFieldInsideCollectionChoiceWrapper()', () => {
    it('should return true for fields inside collection choice wrapper', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`
          <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="test" xmlns:ns0="test">
            <xs:element name="TestDocument">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="CollectionChoiceElement">
                    <xs:complexType>
                      <xs:choice maxOccurs="unbounded">
                        <xs:element name="Email" type="xs:string"/>
                        <xs:element name="Phone" type="xs:string"/>
                      </xs:choice>
                    </xs:complexType>
                  </xs:element>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:schema>
        `),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      const doc = result.document!;
      const choiceWrapper = doc.fields[0].fields[0].fields[0];
      const emailField = choiceWrapper.fields.find((f) => f.name === 'Email')!;

      expect(DocumentService.isFieldInsideCollectionChoiceWrapper(emailField)).toBeTruthy();
    });

    it('should return false for fields inside non-collection choice wrapper', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`
          <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="test" xmlns:ns0="test">
            <xs:element name="TestDocument">
              <xs:complexType>
                <xs:sequence>
                  <xs:element name="RegularChoiceElement">
                    <xs:complexType>
                      <xs:choice>
                        <xs:element name="Choice1" type="xs:string"/>
                      </xs:choice>
                    </xs:complexType>
                  </xs:element>
                </xs:sequence>
              </xs:complexType>
            </xs:element>
          </xs:schema>
        `),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      const doc = result.document!;
      const choiceWrapper = doc.fields[0].fields[0].fields[0];
      const choice1Field = choiceWrapper.fields.find((f) => f.name === 'Choice1')!;

      expect(DocumentService.isFieldInsideCollectionChoiceWrapper(choice1Field)).toBeFalsy();
    });

    it('should return false for fields not inside any choice wrapper', () => {
      const regularField = sourceDoc.fields[0].fields[0];
      expect(DocumentService.isFieldInsideCollectionChoiceWrapper(regularField)).toBeFalsy();
    });
  });

  describe('isCollectionField() with TestDocument.xsd', () => {
    it('should identify CollectionChoiceElement members as collection fields', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockImplementation((filePath: string) => {
          if (filePath.includes('TestDocument.xsd')) {
            return Promise.resolve(
              fs.readFileSync(path.resolve(__dirname, '../../stubs/datamapper/xml/TestDocument.xsd'), 'utf-8'),
            );
          }
          return Promise.reject(new Error('File not found'));
        }),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'TestDocument',
        ['TestDocument.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const doc = result.document!;

      const testDocument = doc.fields[0];
      expect(testDocument.name).toBe('TestDocument');

      const collectionChoiceElement = testDocument.fields.find((f) => f.name === 'CollectionChoiceElement');
      expect(collectionChoiceElement).toBeDefined();

      const choiceWrapper = collectionChoiceElement!.fields[0];
      expect(choiceWrapper.wrapperKind).toBe('choice');
      expect(choiceWrapper.maxOccurs).toBe('unbounded');
      expect(DocumentService.isCollectionField(choiceWrapper)).toBeTruthy();

      const emailField = choiceWrapper.fields.find((f) => f.name === 'Email');
      const phoneField = choiceWrapper.fields.find((f) => f.name === 'Phone');
      const faxField = choiceWrapper.fields.find((f) => f.name === 'Fax');

      expect(emailField).toBeDefined();
      expect(phoneField).toBeDefined();
      expect(faxField).toBeDefined();

      expect(DocumentService.isCollectionField(emailField!)).toBeTruthy();
      expect(DocumentService.isCollectionField(phoneField!)).toBeTruthy();
      expect(DocumentService.isCollectionField(faxField!)).toBeTruthy();

      expect(DocumentService.isFieldInsideCollectionChoiceWrapper(emailField!)).toBeTruthy();
      expect(DocumentService.isFieldInsideCollectionChoiceWrapper(phoneField!)).toBeTruthy();
      expect(DocumentService.isFieldInsideCollectionChoiceWrapper(faxField!)).toBeTruthy();
    });

    it('should not treat regular ChoiceElement members as collection fields', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockImplementation((filePath: string) => {
          if (filePath.includes('TestDocument.xsd')) {
            return Promise.resolve(
              fs.readFileSync(path.resolve(__dirname, '../../stubs/datamapper/xml/TestDocument.xsd'), 'utf-8'),
            );
          }
          return Promise.reject(new Error('File not found'));
        }),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'TestDocument',
        ['TestDocument.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const doc = result.document!;

      const testDocument = doc.fields[0];
      const choiceElement = testDocument.fields.find((f) => f.name === 'ChoiceElement');
      expect(choiceElement).toBeDefined();

      const choiceWrapper = choiceElement!.fields[0];
      expect(choiceWrapper.wrapperKind).toBe('choice');
      expect(choiceWrapper.maxOccurs).toBe(1);
      expect(DocumentService.isCollectionField(choiceWrapper)).toBeFalsy();

      const choice1Field = choiceWrapper.fields.find((f) => f.name === 'Choice1');
      const choice2Field = choiceWrapper.fields.find((f) => f.name === 'Choice2');

      expect(choice1Field).toBeDefined();
      expect(choice2Field).toBeDefined();

      expect(DocumentService.isCollectionField(choice1Field!)).toBeFalsy();
      expect(DocumentService.isCollectionField(choice2Field!)).toBeFalsy();
      expect(DocumentService.isFieldInsideCollectionChoiceWrapper(choice1Field!)).toBeFalsy();
      expect(DocumentService.isFieldInsideCollectionChoiceWrapper(choice2Field!)).toBeFalsy();
    });
  });

  describe('createDocument() error handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.errors![0].message).toContain("There's no top level Element in the schema");
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeDefined();
    });

    it('should handle malformed JSON for JSON schema', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue('{invalid json'),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test',
        ['test.json'],
      );

      expect(result.validationStatus).toBe('error');
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.document).toBeUndefined();
      expect(result.documentDefinition).toBeUndefined();
    });

    it('should handle invalid XML content that looks valid initially', async () => {
      // Mock XML that passes initial validation but fails during processing
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(`<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
                   <xs:element name="test" type="xs:invalid-type" />
                 </xs:schema>`),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test.xsd'],
      );

      // Should handle gracefully even if schema has issues
      expect(result.validationStatus).toBeDefined();
      expect(['success', 'error']).toContain(result.validationStatus);
    });
  });

  describe('createDocument() with multiple files', () => {
    it('should handle multiple schema files', async () => {
      const mockApi = {
        getResourceContent: jest
          .fn()
          .mockResolvedValueOnce(
            `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/ns1" xmlns:tns="http://example.com/ns1">
                     <xs:element name="test1" type="xs:string" />
                     <xs:complexType name="CustomType1">
                       <xs:sequence>
                         <xs:element name="field1" type="xs:string" />
                       </xs:sequence>
                     </xs:complexType>
                   </xs:schema>`,
          )
          .mockResolvedValueOnce(
            `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://example.com/ns2" xmlns:tns="http://example.com/ns2">
                     <xs:element name="test2" type="xs:string" />
                     <xs:complexType name="CustomType2">
                       <xs:sequence>
                         <xs:element name="field2" type="xs:string" />
                       </xs:sequence>
                     </xs:complexType>
                   </xs:schema>`,
          ),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['test1.xsd', 'test2.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      expect(result.document).toBeDefined();
      expect(result.documentDefinition).toBeDefined();
      expect(mockApi.getResourceContent).toHaveBeenCalledTimes(2);
    });
  });

  describe('getRootElementQName()', () => {
    it('should return null for non-XML schema documents', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test'),
      );
      const qName = DocumentService.getRootElementQName(primitiveDoc);
      expect(qName).toBeNull();
    });

    it('should return null for undefined document', () => {
      const qName = DocumentService.getRootElementQName();
      expect(qName).toBeNull();
    });

    it('should return QName for XML schema document', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(getMultipleElementsXsd()),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['MultipleElements.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const qName = DocumentService.getRootElementQName(result.document);
      expect(qName).toBeDefined();
      expect(qName?.getLocalPart()).toBe('Order'); // Default to first element
      expect(qName?.getNamespaceURI()).toBe('io.kaoto.datamapper.test.multiple');
    });
  });

  describe('updateRootElement()', () => {
    it('should return original document for non-XML schema documents', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test'),
      );
      const rootElementOption: RootElementOption = {
        name: 'Test',
        namespaceUri: 'http://test.com',
      };

      const updatedDoc = DocumentService.updateRootElement(primitiveDoc, rootElementOption);
      expect(updatedDoc).toBe(primitiveDoc);
    });

    it('should create new document with different root element for XML schema documents', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(getMultipleElementsXsd()),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['MultipleElements.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const originalDocument = result.document as XmlSchemaDocument;

      // Verify original document has Order as root element
      const originalQName = DocumentService.getRootElementQName(originalDocument);
      expect(originalQName?.getLocalPart()).toBe('Order');

      // Update to Invoice root element
      const invoiceOption: RootElementOption = {
        name: 'Invoice',
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
      };

      const updatedDocument = DocumentService.updateRootElement(originalDocument, invoiceOption);
      expect(updatedDocument).not.toBe(originalDocument); // Should be a new instance
      expect(updatedDocument instanceof XmlSchemaDocument).toBeTruthy();

      // Verify updated document has Invoice as root element
      const updatedQName = DocumentService.getRootElementQName(updatedDocument);
      expect(updatedQName?.getLocalPart()).toBe('Invoice');
      expect(updatedQName?.getNamespaceURI()).toBe('io.kaoto.datamapper.test.multiple');
    });

    it('should clear fieldTypeOverrides and choiceSelections from the definition when root element changes', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(getMultipleElementsXsd()),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['MultipleElements.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const originalDocument = result.document as XmlSchemaDocument;

      originalDocument.definition.fieldTypeOverrides = [
        {
          schemaPath: '/old:Order/field',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.SAFE,
        },
      ];
      originalDocument.definition.choiceSelections = [{ schemaPath: '/old:Order/{choice:0}', selectedMemberIndex: 1 }];
      const substitution: IFieldSubstitution = {
        schemaPath: '/old:Order/field',
        name: 'ns0:Sub',
        originalName: 'ns0:Field',
      };
      originalDocument.definition.fieldSubstitutions = [substitution];

      const invoiceOption: RootElementOption = {
        name: 'Invoice',
        namespaceUri: 'io.kaoto.datamapper.test.multiple',
      };

      const updatedDocument = DocumentService.updateRootElement(originalDocument, invoiceOption);

      expect(updatedDocument.definition.fieldTypeOverrides).toEqual([]);
      expect(updatedDocument.definition.choiceSelections).toEqual([]);
      expect(updatedDocument.definition.fieldSubstitutions).toEqual([]);
    });
  });

  describe('createPrimitiveDocument() edge cases', () => {
    it('should handle different document types correctly', () => {
      const sourceResult = DocumentService.createPrimitiveDocument(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.Primitive,
        'sourceTest',
      );
      expect(sourceResult.document?.documentId).toEqual('sourceTest');

      const targetResult = DocumentService.createPrimitiveDocument(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.Primitive,
        'targetTest',
      );
      expect(targetResult.document?.documentId).toEqual('targetTest');

      const paramResult = DocumentService.createPrimitiveDocument(
        DocumentType.PARAM,
        DocumentDefinitionType.Primitive,
        'paramTest',
      );
      expect(paramResult.document?.documentId).toEqual('paramTest');
    });

    it('should create proper DocumentDefinition for primitives', () => {
      const result = DocumentService.createPrimitiveDocument(
        DocumentType.PARAM,
        DocumentDefinitionType.Primitive,
        'testParam',
      );

      expect(result.documentDefinition?.documentType).toBe(DocumentType.PARAM);
      expect(result.documentDefinition?.definitionType).toBe(DocumentDefinitionType.Primitive);
      expect(result.documentDefinition?.name).toBe('testParam');
      expect(result.documentDefinition?.definitionFiles).toEqual({});
    });
  });

  describe('renameDocument()', () => {
    const testFieldPath = (parent: IParentType, parentPathSegment: string) => {
      for (const field of parent.fields) {
        expect(field.path.documentId).toBe(parentPathSegment);
        if (field.fields && field.fields.length > 0) {
          testFieldPath(field, parentPathSegment);
        }
      }
    };

    it('should rename a primitive document', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test'),
      );

      DocumentService.renameDocument(primitiveDoc, 'renamedTest');
      expect(primitiveDoc).toBeDefined();
      expect(primitiveDoc.documentId).toBe('renamedTest');
      expect(primitiveDoc.name).toBe('renamedTest');
      expect(primitiveDoc.displayName).toBe('renamedTest');
      expect(primitiveDoc.path.documentId).toBe('renamedTest');
    });

    it('should rename a XML document', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(getMultipleElementsXsd()),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.PARAM,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        ['MultipleElements.xsd'],
      );

      expect(result.validationStatus).toBe('success');
      const originalDocument = result.document as XmlSchemaDocument;

      DocumentService.renameDocument(originalDocument, 'renamedTest');
      expect(originalDocument).toBeDefined();
      expect(originalDocument.documentId).toBe('renamedTest');
      expect(originalDocument.name).toBe('renamedTest');
      expect(originalDocument.path.documentId).toBe('renamedTest');

      testFieldPath(originalDocument, 'renamedTest');
    });

    it('should rename a JSON document', async () => {
      const mockApi = {
        getResourceContent: jest.fn().mockResolvedValue(getCartJsonSchema()),
      };

      const result = await DocumentService.createDocument(
        mockApi as unknown as IMetadataApi,
        DocumentType.PARAM,
        DocumentDefinitionType.JSON_SCHEMA,
        'test',
        ['Cart.schema.json'],
      );

      expect(result.validationStatus).toBe('success');
      const originalDocument = result.document as JsonSchemaDocument;

      DocumentService.renameDocument(originalDocument, 'renamedTest');
      expect(originalDocument).toBeDefined();
      expect(originalDocument.documentId).toBe('renamedTest');
      expect(originalDocument.name).toBe('renamedTest');
      expect(originalDocument.path.documentId).toBe('renamedTest');

      testFieldPath(originalDocument, 'renamedTest');
    });
  });

  describe('removeSchemaFile()', () => {
    it('should delegate to XmlSchemaDocumentService for XML schemas', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        {
          'test.xsd': `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="test" type="xs:string" />
</xs:schema>`,
        },
      );

      const result = DocumentService.removeSchemaFile(definition, 'test.xsd');
      expect(result.validationStatus).toBe('error');
      expect(result.errors).toBeDefined();
    });

    it('should delegate to JsonSchemaDocumentService for JSON schemas', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'test.json': '{"type": "object"}' },
      );

      const result = DocumentService.removeSchemaFile(definition, 'test.json');
      expect(result.validationStatus).toBe('error');
      expect(result.errors).toBeDefined();
    });

    it('should return error for unsupported definition types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.Primitive,
        BODY_DOCUMENT_ID,
      );

      const result = DocumentService.removeSchemaFile(definition, 'test.txt');
      expect(result.validationStatus).toBe('error');
      expect(result.errors).toBeDefined();
    });
  });

  describe('resolveSourceDocument()', () => {
    it('should return body document when no documentReferenceName', () => {
      const bodyDoc = TestUtil.createSourceOrderDoc();
      const paramMap = new Map<string, PrimitiveDocument>();
      const absolutePath = new PathExpression();

      const result = DocumentService.resolveSourceDocument(absolutePath, {}, bodyDoc, paramMap);
      expect(result).toBe(bodyDoc);
    });

    it('should return matching parameter document by reference name', () => {
      const bodyDoc = TestUtil.createSourceOrderDoc();
      const paramDoc = DocumentService.createPrimitiveDocument(
        DocumentType.PARAM,
        DocumentDefinitionType.Primitive,
        'myParam',
      ).document!;
      const paramMap = new Map<string, PrimitiveDocument>([['myParam', paramDoc as PrimitiveDocument]]);
      const absolutePath = new PathExpression();
      absolutePath.documentReferenceName = 'myParam';

      const result = DocumentService.resolveSourceDocument(absolutePath, {}, bodyDoc, paramMap);
      expect(result).toBe(paramDoc);
    });

    it('should return undefined when documentReferenceName does not match any parameter', () => {
      const bodyDoc = TestUtil.createSourceOrderDoc();
      const paramMap = new Map<string, PrimitiveDocument>();
      const absolutePath = new PathExpression();
      absolutePath.documentReferenceName = 'nonExistent';

      const result = DocumentService.resolveSourceDocument(absolutePath, {}, bodyDoc, paramMap);
      expect(result).toBeUndefined();
    });
  });

  describe('collectDescendantFields()', () => {
    it('should collect non-Container leaf fields', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const result = DocumentService.collectDescendantFields(shipOrderField, 1);
      expect(result.length).toBeGreaterThan(0);
      for (const field of result) {
        expect(field.type).not.toBe(Types.Container);
      }
    });

    it('should respect maxDepth limit', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shallow = DocumentService.collectDescendantFields(doc, 1);
      const deep = DocumentService.collectDescendantFields(doc, 5);
      expect(deep.length).toBeGreaterThanOrEqual(shallow.length);
    });

    it('should return empty array when maxDepth is 0', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const result = DocumentService.collectDescendantFields(doc, 0);
      expect(result).toEqual([]);
    });

    it('should traverse through wrapper fields without incrementing depth', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = new XmlSchemaField(shipOrderField, 'choice', false);
      choiceField.wrapperKind = 'choice';
      const leafField = new XmlSchemaField(choiceField, 'leaf', false);
      leafField.type = Types.String;
      choiceField.fields = [leafField];
      shipOrderField.fields.push(choiceField);

      const result = DocumentService.collectDescendantFields(shipOrderField, 2);
      expect(result).toContain(leafField);
    });
  });
});
