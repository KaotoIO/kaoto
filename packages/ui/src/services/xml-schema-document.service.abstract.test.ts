import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import { getExtensionComplexXsd, getFieldSubstitutionXsd } from '../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

describe('XmlSchemaDocumentService / abstract', () => {
  describe('abstract element wrapper', () => {
    const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';

    it('should create an abstract wrapper field via element ref in a sequence', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).not.toBe('error');
      const document = result.document as XmlSchemaDocument;
      const zooField = document.fields[0];
      expect(zooField.name).toBe('Zoo');

      const abstractAnimalField = zooField.fields.find((f) => f.name === 'AbstractAnimal');
      expect(abstractAnimalField).toBeDefined();
      expect(abstractAnimalField!.wrapperKind).toBe('abstract');
      expect(abstractAnimalField!.displayName).toBe('AbstractAnimal');
      expect(abstractAnimalField!.maxOccurs).toBe('unbounded');
    });

    it('should populate concrete substitution members as children, excluding abstract intermediates', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document as XmlSchemaDocument;
      const zooField = document.fields[0];
      const abstractAnimalField = zooField.fields.find((f) => f.name === 'AbstractAnimal')!;

      const childNames = abstractAnimalField.fields.map((f) => f.name);
      expect(childNames).toContain('Cat');
      expect(childNames).toContain('Dog');
      expect(childNames).toContain('Fish');
      expect(childNames).toContain('Kitten');
      expect(childNames).not.toContain('Feline');
      expect(childNames).not.toContain('AbstractAnimal');
    });

    it('should populate type structure on each candidate child', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document as XmlSchemaDocument;
      const zooField = document.fields[0];
      const abstractAnimalField = zooField.fields.find((f) => f.name === 'AbstractAnimal')!;

      const catField = abstractAnimalField.fields.find((f) => f.name === 'Cat')!;
      expect(catField.type).toBe(Types.Container);
      expect(catField.namedTypeFragmentRefs.length).toBeGreaterThan(0);

      const dogField = abstractAnimalField.fields.find((f) => f.name === 'Dog')!;
      expect(dogField.type).toBe(Types.Container);
      expect(dogField.namedTypeFragmentRefs.length).toBeGreaterThan(0);

      const fishField = abstractAnimalField.fields.find((f) => f.name === 'Fish')!;
      expect(fishField.type).toBe(Types.Container);
      expect(fishField.fields.some((f) => f.name === 'freshwater')).toBe(true);
    });

    it('should create an abstract wrapper when the root element is abstract', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        { namespaceUri: NS_SUBSTITUTION, name: 'AbstractAnimal' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).not.toBe('error');
      const document = result.document as XmlSchemaDocument;
      const rootField = document.fields[0];
      expect(rootField.name).toBe('AbstractAnimal');
      expect(rootField.wrapperKind).toBe('abstract');

      const childNames = rootField.fields.map((f) => f.name);
      expect(childNames).toContain('Cat');
      expect(childNames).toContain('Dog');
      expect(childNames).toContain('Fish');
      expect(childNames).toContain('Kitten');
    });

    it('should create abstract wrappers for simple-type abstract elements', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document as XmlSchemaDocument;
      const zooField = document.fields[0];

      const abstractLabelField = zooField.fields.find((f) => f.name === 'AbstractLabel');
      expect(abstractLabelField).toBeDefined();
      expect(abstractLabelField!.wrapperKind).toBe('abstract');
      const labelChildNames = abstractLabelField!.fields.map((f) => f.name);
      expect(labelChildNames).toContain('Nickname');
      expect(labelChildNames).toContain('XsStringTag');

      const abstractCountField = zooField.fields.find((f) => f.name === 'AbstractCount');
      expect(abstractCountField).toBeDefined();
      expect(abstractCountField!.wrapperKind).toBe('abstract');
      const countChildNames = abstractCountField!.fields.map((f) => f.name);
      expect(countChildNames).toContain('InlineIntCount');
      expect(countChildNames).toContain('SmallIntCount');
    });

    it('should create an abstract wrapper with empty children when there are no substitution candidates', () => {
      const xsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://example.com/test"
           xmlns="http://example.com/test"
           elementFormDefault="qualified">
  <xs:element name="Root">
    <xs:complexType>
      <xs:sequence>
        <xs:element ref="Orphan"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
  <xs:element name="Orphan" type="xs:string" abstract="true"/>
</xs:schema>`;
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'test.xsd': xsd },
        { namespaceUri: 'http://example.com/test', name: 'Root' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).not.toBe('error');
      const document = result.document as XmlSchemaDocument;
      const rootField = document.fields[0];
      const orphanField = rootField.fields.find((f) => f.name === 'Orphan');
      expect(orphanField).toBeDefined();
      expect(orphanField!.wrapperKind).toBe('abstract');
      expect(orphanField!.fields).toHaveLength(0);
    });

    it('should preserve minOccurs/maxOccurs from the particle, not the global element', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
        { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      const document = result.document as XmlSchemaDocument;
      const zooField = document.fields[0];
      const abstractAnimalField = zooField.fields.find((f) => f.name === 'AbstractAnimal')!;
      expect(abstractAnimalField.minOccurs).toBe(1);
      expect(abstractAnimalField.maxOccurs).toBe('unbounded');

      const abstractLabelField = zooField.fields.find((f) => f.name === 'AbstractLabel')!;
      expect(abstractLabelField.minOccurs).toBe(1);
      expect(abstractLabelField.maxOccurs).toBe(1);
    });
  });

  describe('abstract complexType', () => {
    it('should set isAbstractType on nested fields with abstract complexType', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extensionComplex.xsd': getExtensionComplexXsd() },
        { namespaceUri: 'http://www.example.com/TEST', name: 'TestAbstractType' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      const rootField = document.fields[0];

      const msgField = rootField.fields.find((f) => f.name === 'msg');
      expect(msgField).toBeDefined();
      expect(msgField!.isAbstractType).toBe(true);

      const reqField = rootField.fields.find((f) => f.name === 'req');
      expect(reqField).toBeDefined();
      expect(reqField!.isAbstractType).toBe(true);
    });

    it('should not set isAbstractType on nested fields with concrete or simple types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'extensionComplex.xsd': getExtensionComplexXsd() },
        { namespaceUri: 'http://www.example.com/TEST', name: 'TestAbstractType' },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const document = result.document as XmlSchemaDocument;
      const rootField = document.fields[0];

      const concreteReqField = rootField.fields.find((f) => f.name === 'concreteReq');
      expect(concreteReqField).toBeDefined();
      expect(concreteReqField!.isAbstractType).toBeFalsy();

      const simpleField = rootField.fields.find((f) => f.name === 'simpleField');
      expect(simpleField).toBeDefined();
      expect(simpleField!.isAbstractType).toBeFalsy();
    });
  });
});
