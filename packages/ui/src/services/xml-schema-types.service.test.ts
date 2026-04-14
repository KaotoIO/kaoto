import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper/document';
import { NS_XML_SCHEMA } from '../models/datamapper/standard-namespaces';
import { FieldOverrideVariant, TypeDerivation, Types } from '../models/datamapper/types';
import {
  getExtensionComplexXsd,
  getFieldSubstitutionNoNsXsd,
  getFieldSubstitutionXsd,
  getRestrictionComplexXsd,
  getSimpleTypeInheritanceXsd,
  TestUtil,
} from '../stubs/datamapper/data-mapper';
import { QName } from '../xml-schema-ts/QName';
import { JsonSchemaDocument, JsonSchemaField } from './json-schema-document.model';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaTypesService } from './xml-schema-types.service';

describe('XmlSchemaTypesService', () => {
  describe('parseTypeOverride()', () => {
    it('should parse qualified type name with namespace', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!field) throw new Error('Field not found');

      const namespaceMap = { xs: NS_XML_SCHEMA };
      const result = XmlSchemaTypesService.parseTypeOverride('xs:string', namespaceMap, field);

      expect(result.type).toBe(Types.String);
      expect(result.typeQName.getLocalPart()).toBe('string');
      expect(result.typeQName.getNamespaceURI()).toBe(NS_XML_SCHEMA);
    });

    it('should parse unqualified type name as Container type', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!field) throw new Error('Field not found');

      const result = XmlSchemaTypesService.parseTypeOverride('string', {}, field);

      expect(result.type).toBe(Types.Container);
      expect(result.typeQName.getLocalPart()).toBe('string');
      expect(result.typeQName.getNamespaceURI()).toBe('');
    });

    it('should determine SAFE variant for xs:anyType field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!field) throw new Error('Field not found');
      field.type = Types.AnyType;

      const namespaceMap = { xs: NS_XML_SCHEMA };
      const result = XmlSchemaTypesService.parseTypeOverride('xs:string', namespaceMap, field);

      expect(result.variant).toBe(FieldOverrideVariant.SAFE);
    });

    it('should determine FORCE variant for incompatible type change', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!field) throw new Error('Field not found');
      field.type = Types.String;

      const namespaceMap = { xs: NS_XML_SCHEMA };
      const result = XmlSchemaTypesService.parseTypeOverride('xs:int', namespaceMap, field);

      expect(result.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should throw for empty local part', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!field) throw new Error('Field not found');

      expect(() => XmlSchemaTypesService.parseTypeOverride('xs:', { xs: NS_XML_SCHEMA }, field)).toThrow(
        "Invalid type override 'xs:'",
      );
    });

    it('should throw for extra colons in type string', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!field) throw new Error('Field not found');

      expect(() => XmlSchemaTypesService.parseTypeOverride('a:b:c', { a: NS_XML_SCHEMA }, field)).toThrow(
        "Invalid type override 'a:b:c'",
      );
    });
  });

  describe('mapTypeStringToEnum()', () => {
    it('should map xs:string to Types.String', () => {
      const result = XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'string');
      expect(result).toBe(Types.String);
    });

    it('should map xs:int to Types.Integer', () => {
      const result = XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'int');
      expect(result).toBe(Types.Integer);
    });

    it('should map xs:boolean to Types.Boolean', () => {
      const result = XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'boolean');
      expect(result).toBe(Types.Boolean);
    });

    it('should map xs:dateTime to Types.DateTime', () => {
      const result = XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'dateTime');
      expect(result).toBe(Types.DateTime);
    });

    it('should map xs:decimal to Types.Decimal', () => {
      const result = XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'decimal');
      expect(result).toBe(Types.Decimal);
    });

    it('should map non-XSD types to Types.Container', () => {
      const result = XmlSchemaTypesService.mapTypeStringToEnum('http://example.com', 'CustomType');
      expect(result).toBe(Types.Container);
    });

    it('should handle case-insensitive XSD type names', () => {
      const result = XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'String');
      expect(result).toBe(Types.String);
    });
  });

  describe('isExtensionOrRestriction()', () => {
    it('should return true for extension relationship', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const baseType = doc.xmlSchemaCollection.getTypeByQName(new QName('http://www.example.com/EXTENSION', 'Person'));

      const derivedType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/EXTENSION', 'Employee'),
      );

      expect(baseType).toBeDefined();
      expect(derivedType).toBeDefined();

      const isExtension = XmlSchemaTypesService.isExtensionOrRestriction(
        derivedType!,
        baseType!,
        doc.xmlSchemaCollection,
      );

      expect(isExtension).toBe(true);
    });

    it('should return true for restriction relationship', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'restriction.xsd': getRestrictionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const baseType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/RESTRICTION', 'Address'),
      );

      const derivedType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/RESTRICTION', 'USAddress'),
      );

      expect(baseType).toBeDefined();
      expect(derivedType).toBeDefined();

      const isRestriction = XmlSchemaTypesService.isExtensionOrRestriction(
        derivedType!,
        baseType!,
        doc.xmlSchemaCollection,
      );

      expect(isRestriction).toBe(true);
    });

    it('should return true for simpleType restriction', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'simpleType.xsd': getRestrictionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const baseType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/RESTRICTION', 'Address'),
      );

      const derivedType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/RESTRICTION', 'USAddress'),
      );

      expect(baseType).toBeDefined();
      expect(derivedType).toBeDefined();

      const isRestriction = XmlSchemaTypesService.isExtensionOrRestriction(
        derivedType!,
        baseType!,
        doc.xmlSchemaCollection,
      );

      expect(isRestriction).toBe(true);
    });

    it('should return false for unrelated types', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const type1 = doc.xmlSchemaCollection.getTypeByQName(new QName(NS_XML_SCHEMA, 'string'));

      const type2 = doc.xmlSchemaCollection.getTypeByQName(new QName(NS_XML_SCHEMA, 'int'));

      if (!type1 || !type2) {
        return;
      }

      const isRelated = XmlSchemaTypesService.isExtensionOrRestriction(type1, type2, doc.xmlSchemaCollection);

      expect(isRelated).toBe(false);
    });

    it('should return true when comparing type to itself', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const type = doc.xmlSchemaCollection.getTypeByQName(new QName(NS_XML_SCHEMA, 'string'));

      if (!type) {
        return;
      }

      const isSame = XmlSchemaTypesService.isExtensionOrRestriction(type, type, doc.xmlSchemaCollection);

      expect(isSame).toBe(true);
    });
  });

  describe('getExtensionsAndRestrictions()', () => {
    it('should find all derived types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const messageType = doc.xmlSchemaCollection.getTypeByQName(new QName('http://www.example.com/TEST', 'Message'));

      const baseRequestType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/TEST', 'BaseRequest'),
      );

      expect(messageType).toBeDefined();
      expect(baseRequestType).toBeDefined();

      const derivedFromMessage = XmlSchemaTypesService.getExtensionsAndRestrictions(
        messageType!,
        doc.xmlSchemaCollection,
      );

      expect(Array.isArray(derivedFromMessage)).toBe(true);

      const isBaseRequestDerived = XmlSchemaTypesService.isExtensionOrRestriction(
        baseRequestType!,
        messageType!,
        doc.xmlSchemaCollection,
      );
      expect(isBaseRequestDerived).toBe(true);
    });

    it('should exclude base type from results', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const baseType = doc.xmlSchemaCollection.getTypeByQName(new QName(NS_XML_SCHEMA, 'string'));

      if (!baseType) {
        return;
      }

      const derivedTypes = XmlSchemaTypesService.getExtensionsAndRestrictions(baseType, doc.xmlSchemaCollection);

      expect(derivedTypes.every((t) => t !== baseType)).toBe(true);
    });
  });

  describe('getAllUserDefinedTypes()', () => {
    it('should return all user-defined types from schema', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.xmlSchemaCollection, namespaceMap);

      expect(Object.keys(userTypes).length).toBeGreaterThan(0);
      expect(Object.values(userTypes).every((t) => !t.isBuiltIn)).toBe(true);
      expect(Object.values(userTypes).some((t) => t.displayName === 'ConcreteRequest')).toBe(true);
      expect(Object.values(userTypes).some((t) => t.displayName === 'SimpleResponse')).toBe(true);
      expect(Object.values(userTypes).some((t) => t.displayName === 'Message')).toBe(false);
      expect(Object.values(userTypes).some((t) => t.displayName === 'BaseRequest')).toBe(false);
    });

    it('should use correct namespace prefixes', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const namespaceMap = { myprefix: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.xmlSchemaCollection, namespaceMap);

      expect(Object.keys(userTypes).length).toBeGreaterThan(0);
      expect(Object.keys(userTypes).every((k) => k.startsWith('myprefix:') || !k.includes(':'))).toBe(true);
    });

    it('should exclude abstract complexTypes from results', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.xmlSchemaCollection, namespaceMap);
      const displayNames = Object.values(userTypes).map((t) => t.displayName);

      expect(displayNames).not.toContain('Message');
      expect(displayNames).not.toContain('BaseRequest');
      expect(displayNames).toContain('ConcreteRequest');
      expect(displayNames).toContain('SimpleResponse');
      expect(displayNames).toContain('ShortString');
    });
  });

  describe('getAllBuiltInTypes()', () => {
    it('should return all built-in XSD types', () => {
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const builtInTypes = XmlSchemaTypesService.getAllBuiltInTypes(namespaceMap);

      expect(Object.keys(builtInTypes).length).toBeGreaterThan(0);
      expect(Object.values(builtInTypes).every((t) => t.isBuiltIn)).toBe(true);
      expect(Object.values(builtInTypes).some((t) => t.displayName === 'xs:string')).toBe(true);
      expect(Object.values(builtInTypes).some((t) => t.displayName === 'xs:int')).toBe(true);
      expect(Object.values(builtInTypes).some((t) => t.displayName === 'xs:boolean')).toBe(true);
      expect(Object.values(builtInTypes).some((t) => t.displayName === 'xs:dateTime')).toBe(true);
    });

    it('should use custom namespace prefix', () => {
      const namespaceMap = { xsd: NS_XML_SCHEMA };

      const builtInTypes = XmlSchemaTypesService.getAllBuiltInTypes(namespaceMap);

      expect(Object.keys(builtInTypes).length).toBeGreaterThan(0);
      expect(Object.values(builtInTypes).every((t) => t.displayName.startsWith('xsd:'))).toBe(true);
    });

    it('should use localPart without prefix when namespace not found in namespace map', () => {
      const namespaceMap = {};

      const builtInTypes = XmlSchemaTypesService.getAllBuiltInTypes(namespaceMap);

      expect(Object.keys(builtInTypes).length).toBeGreaterThan(0);
      expect(Object.values(builtInTypes).every((t) => !t.displayName.includes(':'))).toBe(true);
    });

    it('should have namespaceURI set to NS_XML_SCHEMA', () => {
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const builtInTypes = XmlSchemaTypesService.getAllBuiltInTypes(namespaceMap);

      expect(Object.values(builtInTypes).every((t) => t.typeQName.getNamespaceURI() === NS_XML_SCHEMA)).toBe(true);
    });
  });

  describe('getAllXmlSchemaTypes()', () => {
    it('should return both built-in and user-defined types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const allTypes = XmlSchemaTypesService.getAllXmlSchemaTypes(doc, namespaceMap);

      const builtInTypes = Object.values(allTypes).filter((t) => t.isBuiltIn);
      const userDefinedTypes = Object.values(allTypes).filter((t) => !t.isBuiltIn);
      expect(builtInTypes.length).toBeGreaterThan(0);
      expect(userDefinedTypes.length).toBeGreaterThan(0);
    });

    it('should return empty when document has no xmlSchemaCollection', () => {
      const doc = { xmlSchemaCollection: undefined } as unknown as XmlSchemaDocument;
      const namespaceMap = { xs: NS_XML_SCHEMA };

      const allTypes = XmlSchemaTypesService.getAllXmlSchemaTypes(doc, namespaceMap);
      expect(allTypes).toEqual({});
    });
  });

  describe('getTypeOverrideCandidatesForField()', () => {
    it('should return candidates for field with derived types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const messageQName = new QName('http://www.example.com/TEST', 'Message');
      const field = new XmlSchemaField(doc, 'testField', false);
      field.typeQName = messageQName;

      const candidates = XmlSchemaTypesService.getTypeOverrideCandidatesForField(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(Object.keys(candidates).length).toBeGreaterThan(0);
      expect(Object.values(candidates).some((c) => c.displayName === 'ConcreteRequest')).toBe(true);
      expect(Object.values(candidates).some((c) => c.displayName === 'BaseRequest')).toBe(false);
    });

    it('should return empty when field has no typeQName', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { xs: NS_XML_SCHEMA };
      const field = new XmlSchemaField(doc, 'emptyField', false);

      const candidates = XmlSchemaTypesService.getTypeOverrideCandidatesForField(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(candidates).toEqual({});
    });

    it('should return empty when typeQName resolves to no type', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const namespaceMap = { xs: NS_XML_SCHEMA };
      const field = new XmlSchemaField(doc, 'fakeField', false);
      field.typeQName = new QName('http://nonexistent.com', 'Fake');

      const candidates = XmlSchemaTypesService.getTypeOverrideCandidatesForField(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(candidates).toEqual({});
    });

    it('should exclude abstract complexTypes from override candidates', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const messageQName = new QName('http://www.example.com/TEST', 'Message');
      const field = new XmlSchemaField(doc, 'testField', false);
      field.typeQName = messageQName;

      const candidates = XmlSchemaTypesService.getTypeOverrideCandidatesForField(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );
      const displayNames = Object.values(candidates).map((c) => c.displayName);

      expect(displayNames).not.toContain('BaseRequest');
      expect(displayNames).toContain('ConcreteRequest');
    });
  });

  describe('isCompatibleContainerTypeOverride()', () => {
    it('should return false when ownerDocument lacks xmlSchemaCollection', () => {
      const jsonDoc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'json-doc'),
      );
      const field = new JsonSchemaField(jsonDoc, 'testField', Types.Container);
      field.type = Types.Container;

      const result = XmlSchemaTypesService.isCompatibleContainerTypeOverride(
        field,
        Types.Container,
        new QName('http://example.com', 'SomeType'),
        'http://example.com',
      );

      expect(result).toBe(false);
    });

    it('should return false when new type is not found in schema', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const field = new XmlSchemaField(doc, 'testField', false);
      field.type = Types.Container;
      field.typeQName = new QName('http://www.example.com/TEST', 'Message');

      const isCompatible = XmlSchemaTypesService.isCompatibleContainerTypeOverride(
        field,
        Types.Container,
        new QName('http://www.example.com/TEST', 'NonExistentType'),
        'http://www.example.com/TEST',
      );

      expect(isCompatible).toBe(false);
    });
  });

  describe('getAllUserDefinedTypes() - type info details', () => {
    it('should include base type and derivation for derived types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.xmlSchemaCollection, namespaceMap);

      const concreteRequest = Object.values(userTypes).find((t) => t.displayName === 'ConcreteRequest');
      expect(concreteRequest).toBeDefined();
      expect(concreteRequest!.baseQName?.getLocalPart()).toBe('BaseRequest');
      expect(concreteRequest!.derivation).toBe(TypeDerivation.EXTENSION);
    });

    it('should include description from type annotation', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.xmlSchemaCollection, namespaceMap);

      const concreteRequest = Object.values(userTypes).find((t) => t.displayName === 'ConcreteRequest');
      expect(concreteRequest).toBeDefined();
      expect(concreteRequest!.description).toBe('A concrete request type extending BaseRequest.');
    });

    it('should not include base for root types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.xmlSchemaCollection, namespaceMap);

      const simpleResponse = Object.values(userTypes).find((t) => t.displayName === 'SimpleResponse');
      expect(simpleResponse).toBeDefined();
      expect(simpleResponse!.baseQName).toBeUndefined();
      expect(simpleResponse!.derivation).toBeUndefined();
    });

    it('should include simpleType with restriction derivation', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;
      const namespaceMap = { ns0: 'http://www.example.com/TEST', xs: NS_XML_SCHEMA };

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.xmlSchemaCollection, namespaceMap);

      const shortString = Object.values(userTypes).find((t) => t.displayName === 'ShortString');
      expect(shortString).toBeDefined();
      expect(shortString!.baseQName?.getLocalPart()).toBe('string');
      expect(shortString!.baseQName?.getNamespaceURI()).toBe(NS_XML_SCHEMA);
      expect(shortString!.derivation).toBe(TypeDerivation.RESTRICTION);
    });
  });

  describe('mapTypeStringToEnum() - additional XSD types', () => {
    it('should map xs:duration to Types.Duration', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'duration')).toBe(Types.Duration);
    });

    it('should map xs:hexBinary to Types.String', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'hexBinary')).toBe(Types.String);
    });

    it('should map xs:base64Binary to Types.String', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'base64Binary')).toBe(Types.String);
    });

    it('should map xs:anyURI to Types.AnyURI', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'anyURI')).toBe(Types.AnyURI);
    });

    it('should map xs:QName to Types.QName', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'QName')).toBe(Types.QName);
    });

    it('should map xs:notation to Types.String', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'notation')).toBe(Types.String);
    });

    it('should map unknown XSD type to Types.AnyType', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'unknownXsdType')).toBe(Types.AnyType);
    });

    it('should map xs:dayTimeDuration to Types.DayTimeDuration', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'dayTimeDuration')).toBe(Types.DayTimeDuration);
    });

    it('should map xs:long to Types.Integer', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'long')).toBe(Types.Integer);
    });

    it('should map xs:normalizedString to Types.String', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'normalizedString')).toBe(Types.String);
    });

    it('should map all-lowercase datetime via switch', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'datetime')).toBe(Types.DateTime);
    });

    it('should map all-lowercase anyuri via switch', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'anyuri')).toBe(Types.AnyURI);
    });

    it('should map all-lowercase qname via switch', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'qname')).toBe(Types.QName);
    });

    it('should map yearmonthduration via switch', () => {
      expect(XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, 'yearmonthduration')).toBe(Types.Duration);
    });
  });

  describe('checkSimpleTypeInheritance()', () => {
    it('should detect simple type restriction chain', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'simpleType.xsd': getSimpleTypeInheritanceXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const baseStringType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/SIMPLEINHERIT', 'BaseStringType'),
      );
      const derivedStringType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/SIMPLEINHERIT', 'DerivedStringType'),
      );

      expect(baseStringType).toBeDefined();
      expect(derivedStringType).toBeDefined();

      const isRestriction = XmlSchemaTypesService.isExtensionOrRestriction(
        derivedStringType!,
        baseStringType!,
        doc.xmlSchemaCollection,
      );

      expect(isRestriction).toBe(true);
    });

    it('should detect complexContent extension from complexType with simpleContent', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'simpleType.xsd': getSimpleTypeInheritanceXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const extendedValueType = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/SIMPLEINHERIT', 'ExtendedValueType'),
      );
      const complexExtendingSimple = doc.xmlSchemaCollection.getTypeByQName(
        new QName('http://www.example.com/SIMPLEINHERIT', 'ComplexExtendingSimple'),
      );

      expect(extendedValueType).toBeDefined();
      expect(complexExtendingSimple).toBeDefined();

      const isExtension = XmlSchemaTypesService.isExtensionOrRestriction(
        complexExtendingSimple!,
        extendedValueType!,
        doc.xmlSchemaCollection,
      );

      expect(isExtension).toBe(true);
    });
  });

  function createSubstitutionDoc() {
    const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
      'FieldSubstitution.xsd': getFieldSubstitutionXsd(),
    });
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    expect(result.validationStatus).toBe('success');
    return result.document as XmlSchemaDocument;
  }

  describe('getSubstitutionGroupMembers()', () => {
    it('should return concrete members including transitive ones, excluding abstract intermediates', () => {
      const doc = createSubstitutionDoc();
      const headElement = doc.xmlSchemaCollection.getElementByQName(
        new QName('http://www.example.com/SUBSTITUTION', 'AbstractAnimal'),
      );
      expect(headElement).toBeDefined();

      const members = XmlSchemaTypesService.getSubstitutionGroupMembers(headElement!, doc.xmlSchemaCollection);

      expect(members.length).toBe(4);
      const names = members.map((el) => el.getName());
      expect(names).toContain('Cat');
      expect(names).toContain('Dog');
      expect(names).toContain('Fish');
      expect(names).toContain('Kitten');
      expect(names).not.toContain('Feline');
    });

    it('should include transitive member Kitten via abstract Feline', () => {
      const doc = createSubstitutionDoc();
      const felineElement = doc.xmlSchemaCollection.getElementByQName(
        new QName('http://www.example.com/SUBSTITUTION', 'Feline'),
      );
      expect(felineElement).toBeDefined();

      const members = XmlSchemaTypesService.getSubstitutionGroupMembers(felineElement!, doc.xmlSchemaCollection);

      expect(members.length).toBe(1);
      expect(members[0].getName()).toBe('Kitten');
    });

    it('should return [] when element has no substitution group members', () => {
      const doc = createSubstitutionDoc();
      const catElement = doc.xmlSchemaCollection.getElementByQName(
        new QName('http://www.example.com/SUBSTITUTION', 'Cat'),
      );
      expect(catElement).toBeDefined();

      const members = XmlSchemaTypesService.getSubstitutionGroupMembers(catElement!, doc.xmlSchemaCollection);

      expect(members).toEqual([]);
    });
  });

  describe('getFieldSubstitutionCandidates()', () => {
    const SUBSTITUTION_NS = 'http://www.example.com/SUBSTITUTION';

    it('should return Cat, Dog, Fish and transitive Kitten candidates for unsubstituted field', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: SUBSTITUTION_NS, xs: NS_XML_SCHEMA };

      const field = new XmlSchemaField(doc, 'AbstractAnimal', false);
      field.namespaceURI = SUBSTITUTION_NS;
      field.typeOverride = FieldOverrideVariant.NONE;

      const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(Object.keys(candidates).length).toBe(4);
      expect(
        Object.entries(candidates).some(
          ([key, info]) => key === 'sub:Cat' && info.qname.getLocalPart() === 'Cat' && info.type === Types.Container,
        ),
      ).toBe(true);
      expect(
        Object.entries(candidates).some(
          ([key, info]) => key === 'sub:Dog' && info.qname.getLocalPart() === 'Dog' && info.type === Types.Container,
        ),
      ).toBe(true);
      expect(
        Object.entries(candidates).some(
          ([key, info]) => key === 'sub:Fish' && info.qname.getLocalPart() === 'Fish' && info.type === Types.Container,
        ),
      ).toBe(true);
      expect(
        Object.entries(candidates).some(
          ([key, info]) =>
            key === 'sub:Kitten' && info.qname.getLocalPart() === 'Kitten' && info.type === Types.Container,
        ),
      ).toBe(true);
    });

    it('should return Cat, Dog, Fish and transitive Kitten candidates for substituted field', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: SUBSTITUTION_NS, xs: NS_XML_SCHEMA };

      const field = new XmlSchemaField(doc, 'Cat', false);
      field.namespaceURI = SUBSTITUTION_NS;
      field.typeOverride = FieldOverrideVariant.SUBSTITUTION;
      field.originalField = {
        name: 'AbstractAnimal',
        displayName: 'AbstractAnimal',
        namespaceURI: SUBSTITUTION_NS,
        namespacePrefix: null,
        type: Types.Container,
        typeQName: new QName(SUBSTITUTION_NS, 'Animal_t'),
        namedTypeFragmentRefs: [],
      };

      const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(Object.keys(candidates).length).toBe(4);
      expect(
        Object.entries(candidates).some(
          ([key, info]) => key === 'sub:Cat' && info.qname.getLocalPart() === 'Cat' && info.type === Types.Container,
        ),
      ).toBe(true);
      expect(
        Object.entries(candidates).some(
          ([key, info]) => key === 'sub:Dog' && info.qname.getLocalPart() === 'Dog' && info.type === Types.Container,
        ),
      ).toBe(true);
      expect(
        Object.entries(candidates).some(
          ([key, info]) => key === 'sub:Fish' && info.qname.getLocalPart() === 'Fish' && info.type === Types.Container,
        ),
      ).toBe(true);
      expect(
        Object.entries(candidates).some(
          ([key, info]) =>
            key === 'sub:Kitten' && info.qname.getLocalPart() === 'Kitten' && info.type === Types.Container,
        ),
      ).toBe(true);
    });

    it('should return {} when element is not found in collection', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: SUBSTITUTION_NS, xs: NS_XML_SCHEMA };

      const field = new XmlSchemaField(doc, 'UnknownElement', false);
      field.namespaceURI = SUBSTITUTION_NS;
      field.typeOverride = FieldOverrideVariant.NONE;

      const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(candidates).toEqual({});
    });

    it('should return {} when element has no substitution group members', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: SUBSTITUTION_NS, xs: NS_XML_SCHEMA };

      const field = new XmlSchemaField(doc, 'Cat', false);
      field.namespaceURI = SUBSTITUTION_NS;
      field.typeOverride = FieldOverrideVariant.NONE;

      const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(candidates).toEqual({});
    });

    it('should return substitution candidates for a blank-namespace head element', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        {
          'FieldSubstitutionNoNs.xsd': getFieldSubstitutionNoNsXsd(),
        },
      );
      const doc = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document as XmlSchemaDocument;
      const abstractAnimalField = doc.fields[0];

      const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
        abstractAnimalField,
        doc.xmlSchemaCollection,
        {},
      );

      expect(Object.keys(candidates).includes('Cat')).toBe(true);
      expect(Object.keys(candidates).includes('Dog')).toBe(true);
    });

    it('should resolve anonymous xs:simpleType restriction member as the base primitive type', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: SUBSTITUTION_NS, xs: NS_XML_SCHEMA };

      const field = new XmlSchemaField(doc, 'AbstractCount', false);
      field.namespaceURI = SUBSTITUTION_NS;
      field.typeOverride = FieldOverrideVariant.NONE;

      const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(Object.keys(candidates).includes('sub:InlineIntCount')).toBe(true);
      expect(candidates['sub:InlineIntCount'].type).toBe(Types.Integer);
    });

    it('should resolve multi-hop named xs:simpleType restriction chain (SmallInt_t -> PositiveInt_t -> xs:int) as the primitive base type', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: SUBSTITUTION_NS, xs: NS_XML_SCHEMA };

      const field = new XmlSchemaField(doc, 'AbstractCount', false);
      field.namespaceURI = SUBSTITUTION_NS;
      field.typeOverride = FieldOverrideVariant.NONE;

      const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(Object.keys(candidates).includes('sub:SmallIntCount')).toBe(true);
      expect(candidates['sub:SmallIntCount'].type).toBe(Types.Integer);
    });

    it('should assign deterministic prefixes and produce distinct keys when namespace is not pre-registered', () => {
      const doc = createSubstitutionDoc();

      const field = new XmlSchemaField(doc, 'AbstractAnimal', false);
      field.namespaceURI = SUBSTITUTION_NS;
      field.typeOverride = FieldOverrideVariant.NONE;

      const namespaceMap: Record<string, string> = {};
      const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
        field,
        doc.xmlSchemaCollection,
        namespaceMap,
      );

      expect(Object.keys(candidates).length).toBe(4);
      const keys = Object.keys(candidates);
      expect(keys.every((k) => k.includes(':'))).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('determineOverrideVariant()', () => {
    it('should return SAFE for compatible container type override', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'extension.xsd': getExtensionComplexXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const messageQName = new QName('http://www.example.com/TEST', 'Message');
      const baseRequestQName = new QName('http://www.example.com/TEST', 'BaseRequest');

      const field = new XmlSchemaField(doc, 'testField', false);
      field.type = Types.Container;
      field.typeQName = messageQName;

      const variant = XmlSchemaTypesService.determineOverrideVariant(
        field,
        Types.Container,
        baseRequestQName,
        'http://www.example.com/TEST',
      );

      expect(variant).toBe(FieldOverrideVariant.SAFE);
    });
  });

  describe('resolveSubstitution()', () => {
    const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';

    it('should return undefined for non-XmlSchemaDocument', () => {
      const jsonDoc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.JSON_SCHEMA, 'test', {}),
      );
      const result = XmlSchemaTypesService.resolveSubstitution(
        jsonDoc,
        { schemaPath: '/x', name: 'Cat', originalName: 'x' },
        {},
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined for malformed substitution name', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const emptyLocal = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractAnimal', name: 'sub:', originalName: 'sub:AbstractAnimal' },
        namespaceMap,
      );
      expect(emptyLocal).toBeUndefined();

      const extraColon = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractAnimal', name: 'a:b:c', originalName: 'sub:AbstractAnimal' },
        namespaceMap,
      );
      expect(extraColon).toBeUndefined();
    });

    it('should return undefined when element is not found', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const result = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractAnimal', name: 'sub:NonExistent', originalName: 'sub:AbstractAnimal' },
        namespaceMap,
      );
      expect(result).toBeUndefined();
    });

    it('should return undefined when prefix is present but not in namespaceMap', () => {
      const doc = createSubstitutionDoc();
      const result = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractAnimal', name: 'sub:Cat', originalName: 'sub:AbstractAnimal' },
        {},
      );
      expect(result).toBeUndefined();
    });

    it('should resolve Cat substitute element with Container type', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const result = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractAnimal', name: 'sub:Cat', originalName: 'sub:AbstractAnimal' },
        namespaceMap,
      );

      expect(result).toBeDefined();
      expect(result!.qname.getLocalPart()).toBe('Cat');
      expect(result!.qname.getNamespaceURI()).toBe(NS_SUBSTITUTION);
      expect(result!.type).toBe(Types.Container);
      expect(result!.namedTypeFragmentRefs.length).toBeGreaterThan(0);
    });

    it('should resolve Dog substitute element with Container type', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const result = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractAnimal', name: 'sub:Dog', originalName: 'sub:AbstractAnimal' },
        namespaceMap,
      );

      expect(result).toBeDefined();
      expect(result!.qname.getLocalPart()).toBe('Dog');
      expect(result!.type).toBe(Types.Container);
    });

    it('should resolve Nickname substitute element typed with user-defined simple type as String', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const result = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractLabel', name: 'sub:Nickname', originalName: 'sub:AbstractLabel' },
        namespaceMap,
      );

      expect(result).toBeDefined();
      expect(result!.qname.getLocalPart()).toBe('Nickname');
      expect(result!.type).toBe(Types.String);
    });

    it('should resolve XsStringTag substitute element typed with xs:string as String', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const result = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractLabel', name: 'sub:XsStringTag', originalName: 'sub:AbstractLabel' },
        namespaceMap,
      );

      expect(result).toBeDefined();
      expect(result!.qname.getLocalPart()).toBe('XsStringTag');
      expect(result!.type).toBe(Types.String);
    });

    describe('blank namespace', () => {
      function createNoNsSubstitutionDoc() {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'test-doc',
          {
            'FieldSubstitutionNoNs.xsd': getFieldSubstitutionNoNsXsd(),
          },
        );
        return XmlSchemaDocumentService.createXmlSchemaDocument(definition).document as XmlSchemaDocument;
      }

      it('should resolve Cat with blank namespace', () => {
        const doc = createNoNsSubstitutionDoc();
        const result = XmlSchemaTypesService.resolveSubstitution(
          doc,
          { schemaPath: '/AbstractAnimal', name: 'Cat', originalName: 'AbstractAnimal' },
          {},
        );

        expect(result).toBeDefined();
        expect(result!.qname.getLocalPart()).toBe('Cat');
        expect(result!.qname.getNamespaceURI()).toBeFalsy();
        expect(result!.type).toBe(Types.Container);
      });

      it('should resolve Dog with blank namespace', () => {
        const doc = createNoNsSubstitutionDoc();
        const result = XmlSchemaTypesService.resolveSubstitution(
          doc,
          { schemaPath: '/AbstractAnimal', name: 'Dog', originalName: 'AbstractAnimal' },
          {},
        );

        expect(result).toBeDefined();
        expect(result!.qname.getLocalPart()).toBe('Dog');
        expect(result!.type).toBe(Types.Container);
      });

      it('should return undefined for unknown element name with blank namespace', () => {
        const doc = createNoNsSubstitutionDoc();
        const result = XmlSchemaTypesService.resolveSubstitution(
          doc,
          { schemaPath: '/AbstractAnimal', name: 'Elephant', originalName: 'AbstractAnimal' },
          {},
        );
        expect(result).toBeUndefined();
      });
    });
  });
});
