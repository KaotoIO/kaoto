import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { IFieldSubstitution, IFieldTypeOverride } from '../../../models/datamapper/metadata';
import { ReportMessage } from '../../../models/datamapper/schema';
import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant, TypeDerivation, Types } from '../../../models/datamapper/types';
import {
  getExtensionComplexXsd,
  getFieldSubstitutionNoNsXsd,
  getFieldSubstitutionXsd,
  getRestrictionComplexXsd,
  getSimpleTypeInheritanceXsd,
  getXmlStubFile,
  TestUtil,
  TYPE_BINDING_COLLISION_NS,
} from '../../../stubs/datamapper/data-mapper';
import {
  XmlSchema,
  XmlSchemaCollection,
  XmlSchemaComplexType,
  XmlSchemaSimpleType,
  XmlSchemaType,
} from '../../../xml-schema-ts';
import { XmlSchemaComplexContent } from '../../../xml-schema-ts/complex/XmlSchemaComplexContent';
import { XmlSchemaComplexContentExtension } from '../../../xml-schema-ts/complex/XmlSchemaComplexContentExtension';
import { QName } from '../../../xml-schema-ts/QName';
import { XmlSchemaSimpleTypeRestriction } from '../../../xml-schema-ts/simple/XmlSchemaSimpleTypeRestriction';
import { DocumentUtilService } from '../document-util.service';
import { JsonSchemaDocument, JsonSchemaField } from '../json-schema/json-schema-document.model';
import { XmlSchemaAssembly } from './xml-schema-assembly.model';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
import { XmlSchemaDocumentUtilService } from './xml-schema-document-util.service';
import { XmlSchemaTypesService } from './xml-schema-types.service';

const REDEFINE_ORDERS = [
  ['base.xsd', 'implementation.xsd'],
  ['implementation.xsd', 'base.xsd'],
];
const SHADOWING_ORDERS = [
  ['implementation.xsd', 'base.xsd', 'other.xsd'],
  ['other.xsd', 'implementation.xsd', 'base.xsd'],
];

describe('XmlSchemaTypesService', () => {
  describe('resolveSimpleTypeToEnum()', () => {
    it.each(SHADOWING_ORDERS)(
      'should follow a redefined simple type to the base chain of the redefined schema, attach order %s, %s, %s',
      (...order) => {
        const doc = TestUtil.createRedefineDoc('redefine/shadowing', order);
        const redefined = doc.assembly.lookupType(new QName('urn:x', 'S')) as XmlSchemaSimpleType;

        expect(XmlSchemaTypesService.resolveSimpleTypeToEnum(redefined, doc.assembly)).toBe(Types.String);
      },
    );

    it('should stop safely when simple type restrictions form a cycle', () => {
      const namespaceURI = 'http://www.example.com/CYCLIC-TYPES';
      const schema = new XmlSchema(namespaceURI);
      const typeA = new XmlSchemaSimpleType(schema, true);
      typeA.setName('TypeA');
      const typeB = new XmlSchemaSimpleType(schema, true);
      typeB.setName('TypeB');

      const restrictionA = new XmlSchemaSimpleTypeRestriction();
      restrictionA.setBaseTypeName(typeB.getQName()!);
      typeA.setContent(restrictionA);
      const restrictionB = new XmlSchemaSimpleTypeRestriction();
      restrictionB.setBaseTypeName(typeA.getQName()!);
      typeB.setContent(restrictionB);

      const collection = new XmlSchemaCollection();
      const getTypeByQName = vi.spyOn(collection, 'getTypeByQName').mockImplementation((qName: QName) => {
        if (getTypeByQName.mock.calls.length > 2) throw new Error('restriction cycle was followed more than once');
        return qName.getLocalPart() === 'TypeA' ? typeA : typeB;
      });

      expect(XmlSchemaTypesService.resolveSimpleTypeToEnum(typeA, new XmlSchemaAssembly(collection))).toBe(
        Types.AnyType,
      );
      expect(getTypeByQName).toHaveBeenCalledTimes(2);
    });

    it('should not resolve a restriction without a base type name', () => {
      const schema = new XmlSchema('urn:test');
      const type = new XmlSchemaSimpleType(schema, true);
      type.setName('Inline');
      type.setContent(new XmlSchemaSimpleTypeRestriction());

      expect(
        XmlSchemaTypesService.resolveSimpleTypeToEnum(type, new XmlSchemaAssembly(new XmlSchemaCollection())),
      ).toBe(Types.AnyType);
    });
  });

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
    it.each(REDEFINE_ORDERS)(
      'should see an ancestor of the base through a type that redefines itself, attach order %s, %s',
      (...order) => {
        const doc = TestUtil.createRedefineDoc('redefine/derived-base', order);
        const redefined = doc.assembly.lookupType(new QName('urn:x', 'T')) as XmlSchemaType;
        const ancestor = doc.assembly.lookupType(new QName('urn:x', 'U')) as XmlSchemaType;

        expect(XmlSchemaTypesService.isExtensionOrRestriction(redefined, ancestor, doc.assembly)).toBe(true);
      },
    );

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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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

      const isRelated = XmlSchemaTypesService.isExtensionOrRestriction(
        type1,
        type2,
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
      );

      expect(isRelated).toBe(false);
    });

    it('should return true when comparing type to itself', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const type = doc.xmlSchemaCollection.getTypeByQName(new QName(NS_XML_SCHEMA, 'string'));

      if (!type) {
        return;
      }

      const isSame = XmlSchemaTypesService.isExtensionOrRestriction(
        type,
        type,
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
      );

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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
      );

      expect(Array.isArray(derivedFromMessage)).toBe(true);

      const isBaseRequestDerived = XmlSchemaTypesService.isExtensionOrRestriction(
        baseRequestType!,
        messageType!,
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
      );
      expect(isBaseRequestDerived).toBe(true);
    });

    it('should exclude base type from results', () => {
      const doc = TestUtil.createSourceOrderDoc();

      const baseType = doc.xmlSchemaCollection.getTypeByQName(new QName(NS_XML_SCHEMA, 'string'));

      if (!baseType) {
        return;
      }

      const derivedTypes = XmlSchemaTypesService.getExtensionsAndRestrictions(
        baseType,
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
      );

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

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.assembly, namespaceMap);

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

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.assembly, namespaceMap);

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

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.assembly, namespaceMap);
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

    it('should expose every supported XSD alias through the canonical type mapping', () => {
      const builtInTypes = XmlSchemaTypesService.getAllBuiltInTypes({ xs: NS_XML_SCHEMA });
      const aliases = [
        'normalizedString',
        'unsignedInt',
        'nonPositiveInteger',
        'base64Binary',
        'gYearMonth',
        'NOTATION',
        'anySimpleType',
      ];

      for (const localName of aliases) {
        expect(builtInTypes[`xs:${localName}`]?.type).toBe(
          XmlSchemaTypesService.mapTypeStringToEnum(NS_XML_SCHEMA, localName),
        );
      }
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
    it.each(REDEFINE_ORDERS)('should list a redefined type as its redefinition, attach order %s, %s', (...order) => {
      const namespaceMap = { x: 'urn:x', xs: NS_XML_SCHEMA };
      const complexTypes = XmlSchemaTypesService.getAllXmlSchemaTypes(
        TestUtil.createRedefineDoc('redefine/complex-type', order),
        namespaceMap,
      );
      const simpleTypes = XmlSchemaTypesService.getAllXmlSchemaTypes(
        TestUtil.createRedefineDoc('redefine/simple-type', order),
        namespaceMap,
      );

      expect(complexTypes['T']?.baseQName?.toString()).toBe(new QName('', 'T').toString());
      expect(complexTypes['T']?.derivation).toBe(TypeDerivation.EXTENSION);
      expect(simpleTypes['x:S']?.baseQName?.toString()).toBe(new QName('urn:x', 'S').toString());
      expect(simpleTypes['x:S']?.derivation).toBe(TypeDerivation.RESTRICTION);
    });

    it.each(['before', 'after'] as const)(
      "should hold the entry's copy behind a QName that an unrelated file also declares (%s)",
      (order) => {
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(
          TestUtil.createTypeBindingCollisionDefinition('OtherSimpleKind', order),
          TYPE_BINDING_COLLISION_NS,
        );
        const allTypes = XmlSchemaTypesService.getAllXmlSchemaTypes(
          result.document as XmlSchemaDocument,
          TYPE_BINDING_COLLISION_NS,
        );

        expect(allTypes['t:Code']?.baseQName?.getLocalPart()).toBe('int');
        expect(allTypes['t:CT']?.baseQName?.getLocalPart()).toBe('Base');
        expect(allTypes['t:CT2']?.baseQName).toBeUndefined();
      },
    );

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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.assembly, namespaceMap);

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

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.assembly, namespaceMap);

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

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.assembly, namespaceMap);

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

      const userTypes = XmlSchemaTypesService.getAllUserDefinedTypes(doc.assembly, namespaceMap);

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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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

      const members = XmlSchemaTypesService.getSubstitutionGroupMembers(
        headElement!,
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
      );

      expect(members).toHaveLength(4);
      const names = members.map((el) => el.getName());
      expect(names).toEqual(['Cat', 'Dog', 'Fish', 'Kitten']);
      expect(names).not.toContain('Feline');
    });

    it('should include transitive member Kitten via abstract Feline', () => {
      const doc = createSubstitutionDoc();
      const felineElement = doc.xmlSchemaCollection.getElementByQName(
        new QName('http://www.example.com/SUBSTITUTION', 'Feline'),
      );
      expect(felineElement).toBeDefined();

      const members = XmlSchemaTypesService.getSubstitutionGroupMembers(
        felineElement!,
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
      );

      expect(members).toHaveLength(1);
      expect(members[0].getName()).toBe('Kitten');
    });

    it('should return [] when element has no substitution group members', () => {
      const doc = createSubstitutionDoc();
      const catElement = doc.xmlSchemaCollection.getElementByQName(
        new QName('http://www.example.com/SUBSTITUTION', 'Cat'),
      );
      expect(catElement).toBeDefined();

      const members = XmlSchemaTypesService.getSubstitutionGroupMembers(
        catElement!,
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
      );

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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
        namespaceMap,
      );

      expect(Object.keys(candidates)).toHaveLength(4);
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
      const fishKey = `FieldSubstitution.xsd#__elem:${SUBSTITUTION_NS}:Fish`;
      expect(candidates['sub:Fish'].namedTypeFragmentRefs).toEqual([fishKey]);
      expect(doc.namedTypeFragments[fishKey]).toBeDefined();
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
        namespaceMap,
      );

      expect(Object.keys(candidates)).toHaveLength(4);
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
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
        new XmlSchemaAssembly(doc.xmlSchemaCollection),
        namespaceMap,
      );

      expect(Object.keys(candidates)).toHaveLength(4);
      const keys = Object.keys(candidates);
      expect(keys.every((k) => k.includes(':'))).toBe(true);
      expect(new Set(keys).size).toBe(keys.length);
    });
  });

  describe('substitution members whose type QName is also declared by an unrelated attached file', () => {
    const NS = 'urn:t';
    const STUB_DIR = 'entry-scope-substitution';
    const MEMBER_KEY = `Types.xsd#{${NS}}CT`;
    const FOREIGN_KEY = `Other.xsd#{${NS}}CT`;
    const attachOrders: Array<[string, string[]]> = [
      ['unrelated file attached first', ['Other.xsd', 'A.xsd', 'Types.xsd']],
      ['unrelated file attached last', ['A.xsd', 'Types.xsd', 'Other.xsd']],
    ];
    const duplicateWarningOf: Record<string, ReportMessage> = {
      'A.xsd': { filePath: 'A.xsd', message: `Multiple schemas share targetNamespace "${NS}": "Other.xsd"` },
      'Other.xsd': {
        filePath: 'Other.xsd',
        message: `Multiple schemas share targetNamespace "${NS}": "A.xsd" (with "Types.xsd")`,
      },
    };

    const createDoc = (order: string[]) => {
      const files = Object.fromEntries(order.map((name) => [name, getXmlStubFile(`${STUB_DIR}/${name}`)]));
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'doc',
        files,
        { namespaceUri: NS, name: 'R' },
        undefined,
        undefined,
        undefined,
        'A.xsd',
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('warning');
      expect(result.warnings).toEqual(
        order.filter((file) => file in duplicateWarningOf).map((file) => duplicateWarningOf[file]),
      );
      return result.document as XmlSchemaDocument;
    };

    const childNames = (doc: XmlSchemaDocument, key: string) => doc.namedTypeFragments[key].fields.map((f) => f.name);

    describe.each(attachOrders)('%s', (_label, order) => {
      it('getFieldSubstitutionCandidates() should bind the member to the entry assembly type', () => {
        const doc = createDoc(order);
        const head = new XmlSchemaField(doc, 'H', false);
        head.namespaceURI = NS;
        head.typeOverride = FieldOverrideVariant.NONE;

        const candidates = XmlSchemaTypesService.getFieldSubstitutionCandidates(
          head,
          new XmlSchemaAssembly(doc.xmlSchemaCollection, 'A.xsd'),
          { t: NS },
        );

        expect(Object.keys(candidates)).toEqual(['t:M']);
        expect(candidates['t:M'].namedTypeFragmentRefs).toEqual([MEMBER_KEY]);
        expect(childNames(doc, candidates['t:M'].namedTypeFragmentRefs[0])).toEqual(['b', 'fromTypes']);
        expect(doc.namedTypeFragments[FOREIGN_KEY].fields.map((f) => f.name)).toEqual(['fromOther']);
      });

      it('resolveSubstitution() should bind the member to the entry assembly type', () => {
        const doc = createDoc(order);

        const info = XmlSchemaTypesService.resolveSubstitution(
          doc,
          { schemaPath: '/t:R/t:H', name: 't:M', originalName: 't:H' },
          { t: NS },
        );

        expect(info?.namedTypeFragmentRefs).toEqual([MEMBER_KEY]);
      });

      it('findSubstitutionGroupHead() should bind the member to the entry assembly type', () => {
        const doc = createDoc(order);

        const found = XmlSchemaTypesService.findSubstitutionGroupHead(
          doc.fields[0],
          'M',
          NS,
          new XmlSchemaAssembly(doc.xmlSchemaCollection, 'A.xsd'),
        );

        expect(found?.headField.name).toBe('H');
        expect(found?.info.namedTypeFragmentRefs).toEqual([MEMBER_KEY]);
      });

      it('parseTypeOverride() should bind the override type to the entry assembly type', () => {
        const doc = createDoc(order);
        const head = new XmlSchemaField(doc, 'H', false);
        head.namespaceURI = NS;

        const result = XmlSchemaTypesService.parseTypeOverride('t:CT', { t: NS }, head);

        expect(result.type).toBe(Types.Container);
        expect(result.namedTypeFragmentRefs).toEqual([MEMBER_KEY]);
      });

      it('processTypeOverride() should expand the children of the entry assembly type', () => {
        const doc = createDoc(order);
        const override: IFieldTypeOverride = {
          schemaPath: '/t:R/t:H',
          type: 't:CT',
          originalType: 't:Base',
          variant: FieldOverrideVariant.SAFE,
        };

        const applied = DocumentUtilService.processTypeOverride(
          doc,
          override,
          { t: NS },
          XmlSchemaTypesService.parseTypeOverride,
        );

        expect(applied).toBe(true);
        const head = doc.fields[0].fields.find((f) => f.name === 'H');
        expect(head?.fields.map((f) => f.name)).toEqual(['b', 'fromTypes']);
      });
    });
  });

  describe('same-QName components in an unrelated attached file', () => {
    type Unrelated = 'OtherSimpleKind' | 'OtherDifferentKind';
    type Order = 'before' | 'after';
    const NS = TYPE_BINDING_COLLISION_NS.t;
    const ENTRY = 'Entry.xsd';
    const CT_KEY = XmlSchemaDocumentUtilService.buildTypeFragmentKey('Types.xsd', new QName(NS, 'CT'));
    const variants: Array<[Unrelated, Order]> = [
      ['OtherSimpleKind', 'before'],
      ['OtherSimpleKind', 'after'],
      ['OtherDifferentKind', 'before'],
      ['OtherDifferentKind', 'after'],
    ];
    const memberVariants: Array<[string, Unrelated, Order]> = [
      ['M', 'OtherDifferentKind', 'before'],
      ['M', 'OtherDifferentKind', 'after'],
      ...variants.map(([unrelated, order]): [string, Unrelated, Order] => ['MS', unrelated, order]),
    ];

    const createDoc = (unrelated: Unrelated, order: Order, fieldSubstitutions?: IFieldSubstitution[]) => {
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(
        TestUtil.createTypeBindingCollisionDefinition(unrelated, order, fieldSubstitutions),
        TYPE_BINDING_COLLISION_NS,
      );
      expect(result.validationStatus).not.toBe('error');
      expect(result.document?.assembly.entrySchemaFile).toBe(ENTRY);
      return result.document as XmlSchemaDocument;
    };
    const candidatesOf = (doc: XmlSchemaDocument, headName: string) => {
      const head = new XmlSchemaField(doc, headName, false);
      head.namespaceURI = NS;
      head.typeOverride = FieldOverrideVariant.NONE;
      return XmlSchemaTypesService.getFieldSubstitutionCandidates(head, doc.assembly, TYPE_BINDING_COLLISION_NS);
    };

    it.each(memberVariants)(
      'getFieldSubstitutionCandidates() should give %s the CT of the entry assembly (%s, %s)',
      (member, unrelated, order) => {
        const candidate = candidatesOf(createDoc(unrelated, order), 'H')[`t:${member}`];

        expect(candidate?.type).toBe(Types.Container);
        expect(candidate?.namedTypeFragmentRefs).toEqual([CT_KEY]);
      },
    );

    it.each(memberVariants)(
      'findSubstitutionGroupHead() should give %s the head H and the CT of the entry assembly (%s, %s)',
      (member, unrelated, order) => {
        const doc = createDoc(unrelated, order);

        const found = XmlSchemaTypesService.findSubstitutionGroupHead(doc.fields[0], member, NS, doc.assembly);

        expect(found?.headField.name).toBe('H');
        expect(found?.info.type).toBe(Types.Container);
        expect(found?.info.namedTypeFragmentRefs).toEqual([CT_KEY]);
      },
    );

    it.each(memberVariants)(
      'a document with the substitution H -> %s should show the children of the entry assembly CT (%s, %s)',
      (member, unrelated, order) => {
        const doc = createDoc(unrelated, order, [{ schemaPath: '/t:R/t:H', name: `t:${member}`, originalName: 't:H' }]);

        const substituted = doc.fields[0].fields.find((f) => f.name === member);
        const resolved = substituted ? DocumentUtilService.resolveTypeFragment(substituted) : undefined;

        expect(resolved?.fields.map((f) => f.name)).toEqual(['b', 'fromTypes']);
      },
    );

    it.each(variants)(
      'getFieldSubstitutionCandidates() should give the abstract member AM the CT of the entry assembly (%s, %s)',
      (unrelated, order) => {
        const candidate = candidatesOf(createDoc(unrelated, order), 'AH')['t:AM'];

        expect(candidate?.type).toBe(Types.Container);
        expect(candidate?.namedTypeFragmentRefs).toEqual([CT_KEY]);
      },
    );

    it.each(variants)(
      'should type the simple-typed member MSC from the entry assembly (%s, %s)',
      (unrelated, order) => {
        const doc = createDoc(unrelated, order);

        const candidate = candidatesOf(doc, 'HC')['t:MSC'];
        const found = XmlSchemaTypesService.findSubstitutionGroupHead(doc.fields[0], 'MSC', NS, doc.assembly);

        expect(candidate?.type).toBe(Types.Integer);
        expect(found?.headField.name).toBe('HC');
        expect(found?.info.type).toBe(Types.Integer);
      },
    );

    it.each(['before', 'after'] as Order[])(
      'getExtensionsAndRestrictions() should resolve candidate types through the assembly only with an entry (%s)',
      (order) => {
        const doc = createDoc('OtherSimpleKind', order);
        const base = doc.assembly.lookupType(new QName(NS, 'Base'))!;
        const withEntry = vi.spyOn(doc.assembly, 'lookupType');
        const noEntry = new XmlSchemaAssembly(doc.xmlSchemaCollection);
        const withoutEntry = vi.spyOn(noEntry, 'lookupType');

        const scoped = XmlSchemaTypesService.getExtensionsAndRestrictions(base, doc.assembly);
        const unscoped = XmlSchemaTypesService.getExtensionsAndRestrictions(base, noEntry);

        expect(withEntry).toHaveBeenCalledWith(new QName(NS, 'CT'));
        expect(scoped.map((t) => t.getParent()?.getSourceURI())).toEqual(['Types.xsd']);
        expect(withoutEntry).not.toHaveBeenCalled();
        const firstCT = doc.xmlSchemaCollection.getTypeByQName(new QName(NS, 'CT'));
        expect(unscoped).toEqual(order === 'after' ? [firstCT] : []);
      },
    );

    it('getSubstitutionGroupMembers() should resolve member elements through the assembly only with an entry', () => {
      const doc = createDoc('OtherSimpleKind', 'before');
      const head = doc.assembly.lookupElement(new QName(NS, 'H'))!;
      const withEntry = vi.spyOn(doc.assembly, 'lookupElement');
      const noEntry = new XmlSchemaAssembly(doc.xmlSchemaCollection);
      const withoutEntry = vi.spyOn(noEntry, 'lookupElement');

      const scoped = XmlSchemaTypesService.getSubstitutionGroupMembers(head, doc.assembly);
      const unscoped = XmlSchemaTypesService.getSubstitutionGroupMembers(head, noEntry);

      expect(withEntry).toHaveBeenCalledWith(new QName(NS, 'M'));
      expect(withoutEntry).not.toHaveBeenCalled();
      expect(unscoped.map((el) => el.getName())).toEqual(scoped.map((el) => el.getName()));
      expect(scoped.map((el) => el.getName())).toEqual(['M', 'MS', 'MU']);
    });

    it.todo('getFieldSubstitutionCandidates() should give MU the CT2 of MemberTypes.xsd (membership rule of #4483)');
    it.todo(
      'findSubstitutionGroupHead() should give MU the head H and the CT2 of MemberTypes.xsd (membership rule of #4483)',
    );
    it.todo('a document with the substitution H -> MU should show b, fromMemberTypes (membership rule of #4483)');
  });

  describe('determineOverrideVariant()', () => {
    it.each(REDEFINE_ORDERS)(
      'should return SAFE from an ancestor of the base to a type that redefines itself, attach order %s, %s',
      (...order) => {
        const doc = TestUtil.createRedefineDoc('redefine/derived-base', order);
        const field = doc.fields[0].fields.find((child) => child.name === 'u') as XmlSchemaField;

        expect(
          XmlSchemaTypesService.determineOverrideVariant(field, Types.Container, new QName('urn:x', 'T'), 'urn:x'),
        ).toBe(FieldOverrideVariant.SAFE);
      },
    );

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
      expect(result!.namedTypeFragmentRefs).toEqual([
        XmlSchemaDocumentUtilService.buildTypeFragmentKey('FieldSubstitution.xsd', new QName(NS_SUBSTITUTION, 'Cat_t')),
      ]);
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

    it('should return undefined for an abstract element', () => {
      const doc = createSubstitutionDoc();
      const result = XmlSchemaTypesService.resolveSubstitution(
        doc,
        { schemaPath: '/sub:AbstractAnimal', name: 'sub:AbstractAnimal', originalName: 'sub:AbstractAnimal' },
        { sub: NS_SUBSTITUTION },
      );
      expect(result).toBeUndefined();
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

    describe('isExtensionOrRestriction()', () => {
      it('should not throw (cycle guard) when complexType derivation chain forms a cycle', () => {
        // TypeA extends TypeB, TypeB extends TypeA, TypeC is an unrelated type.
        // isExtensionOrRestriction(typeA, typeC) would loop forever without a cycle guard.
        const ns = 'http://www.example.com/CYCLIC-COMPLEX';
        const schema = new XmlSchema(ns);

        const typeA = new XmlSchemaComplexType(schema, true);
        typeA.setName('TypeA');
        const typeB = new XmlSchemaComplexType(schema, true);
        typeB.setName('TypeB');
        const typeC = new XmlSchemaComplexType(schema, true);
        typeC.setName('TypeC');

        const contentA = new XmlSchemaComplexContent();
        const extA = new XmlSchemaComplexContentExtension();
        extA.setBaseTypeName(typeB.getQName()!);
        contentA.setContent(extA);
        typeA.setContentModel(contentA);

        const contentB = new XmlSchemaComplexContent();
        const extB = new XmlSchemaComplexContentExtension();
        extB.setBaseTypeName(typeA.getQName()!);
        contentB.setContent(extB);
        typeB.setContentModel(contentB);

        const collection = new XmlSchemaCollection();
        vi.spyOn(collection, 'getTypeByQName').mockImplementation((qName: QName) => {
          if (qName.getLocalPart() === 'TypeA') return typeA;
          if (qName.getLocalPart() === 'TypeB') return typeB;
          return null;
        });

        // Without the cycle guard this would throw RangeError.
        // With the guard it terminates and returns false (typeA is not derived from typeC).
        expect(() =>
          XmlSchemaTypesService.isExtensionOrRestriction(typeA, typeC, new XmlSchemaAssembly(collection)),
        ).not.toThrow();
        expect(XmlSchemaTypesService.isExtensionOrRestriction(typeA, typeC, new XmlSchemaAssembly(collection))).toBe(
          false,
        );
      });

      it('should not throw (cycle guard) when simpleType derivation chain forms a cycle', () => {
        // TypeA restricts TypeB, TypeB restricts TypeA, TypeC is an unrelated simpleType.
        // isExtensionOrRestriction(typeA, typeC) would loop forever without a cycle guard.
        const ns = 'http://www.example.com/CYCLIC-SIMPLE';
        const schema = new XmlSchema(ns);
        const typeA = new XmlSchemaSimpleType(schema, true);
        typeA.setName('TypeA');
        const typeB = new XmlSchemaSimpleType(schema, true);
        typeB.setName('TypeB');
        const typeC = new XmlSchemaSimpleType(schema, true);
        typeC.setName('TypeC');

        const restrictionA = new XmlSchemaSimpleTypeRestriction();
        restrictionA.setBaseTypeName(typeB.getQName()!);
        typeA.setContent(restrictionA);
        const restrictionB = new XmlSchemaSimpleTypeRestriction();
        restrictionB.setBaseTypeName(typeA.getQName()!);
        typeB.setContent(restrictionB);

        const collection = new XmlSchemaCollection();
        vi.spyOn(collection, 'getTypeByQName').mockImplementation((qName: QName) => {
          if (qName.getLocalPart() === 'TypeA') return typeA;
          if (qName.getLocalPart() === 'TypeB') return typeB;
          return null;
        });

        expect(() =>
          XmlSchemaTypesService.isExtensionOrRestriction(typeA, typeC, new XmlSchemaAssembly(collection)),
        ).not.toThrow();
        expect(XmlSchemaTypesService.isExtensionOrRestriction(typeA, typeC, new XmlSchemaAssembly(collection))).toBe(
          false,
        );
      });

      it('should scope type lookup through entrySchemaFile when an unrelated schema declares the same QName', () => {
        // An unrelated schema declares a same-QName BaseStringType first. The collection-wide lookup
        // returns that one, so only the entry-scoped lookup can resolve to the entry's own BaseStringType.
        const ns = 'http://www.example.com/SIMPLEINHERIT';
        const unrelatedXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}">
  <xs:simpleType name="BaseStringType">
    <xs:restriction base="xs:string">
      <xs:maxLength value="5"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>`;
        const def = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'scope-test',
          { 'Unrelated.xsd': unrelatedXsd, 'SimpleTypeInheritance.xsd': getSimpleTypeInheritanceXsd() },
          undefined,
          undefined,
          undefined,
          undefined,
          'SimpleTypeInheritance.xsd',
        );
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(def);
        expect(result.validationStatus).toBe('warning');
        const collection = result.document!.xmlSchemaCollection;

        const entrySchema = collection.getXmlSchema('SimpleTypeInheritance.xsd')[0];
        const derivedType = entrySchema.getTypeByQName(new QName(ns, 'DerivedStringType'), true);
        const entryBaseType = entrySchema.getTypeByQName(new QName(ns, 'BaseStringType'), true);
        expect(derivedType).toBeDefined();
        expect(entryBaseType).toBeDefined();
        expect(collection.getTypeByQName(new QName(ns, 'BaseStringType'))).not.toBe(entryBaseType);

        // With entrySchemaFile — scoped lookup resolves to the entry's own BaseStringType.
        expect(
          XmlSchemaTypesService.isExtensionOrRestriction(
            derivedType!,
            entryBaseType!,
            new XmlSchemaAssembly(collection, 'SimpleTypeInheritance.xsd'),
          ),
        ).toBe(true);

        // Without entrySchemaFile — the collection-wide lookup hits the unrelated declaration.
        expect(
          XmlSchemaTypesService.isExtensionOrRestriction(
            derivedType!,
            entryBaseType!,
            new XmlSchemaAssembly(collection),
          ),
        ).toBe(false);
      });

      it('should resolve and check candidate compatibility against entry-scoped declaration when same QName exists in unrelated schema', () => {
        const ns = 'http://www.example.com/SIMPLEINHERIT';
        // Unrelated.xsd defines:
        // 1. DerivedStringType restricting xs:string (does NOT restrict BaseStringType)
        // 2. UnrelatedCandidate restricting tns:BaseStringType (unrelated claims it extends Base, but entry defines it as xs:int)
        const unrelatedXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:simpleType name="DerivedStringType">
    <xs:restriction base="xs:string">
      <xs:maxLength value="3"/>
    </xs:restriction>
  </xs:simpleType>
  <xs:simpleType name="UnrelatedCandidate">
    <xs:restriction base="tns:BaseStringType">
      <xs:maxLength value="10"/>
    </xs:restriction>
  </xs:simpleType>
</xs:schema>`;
        const entryXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:element name="Root" type="xs:string"/>
  <xs:simpleType name="BaseStringType">
    <xs:restriction base="xs:string">
      <xs:maxLength value="100"/>
    </xs:restriction>
  </xs:simpleType>
  <xs:simpleType name="DerivedStringType">
    <xs:restriction base="tns:BaseStringType">
      <xs:maxLength value="50"/>
    </xs:restriction>
  </xs:simpleType>
  <xs:simpleType name="UnrelatedCandidate">
    <xs:restriction base="xs:int"/>
  </xs:simpleType>
</xs:schema>`;
        const def = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'override-candidate-scope-test',
          { 'Unrelated.xsd': unrelatedXsd, 'Entry.xsd': entryXsd },
          undefined,
          undefined,
          undefined,
          undefined,
          'Entry.xsd',
        );
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(def);
        const doc = result.document as XmlSchemaDocument;
        const field = new XmlSchemaField(doc, 'test', false);
        field.typeQName = new QName(ns, 'BaseStringType');

        const namespaceMap: Record<string, string> = { tns: ns };
        const candidates = XmlSchemaTypesService.getTypeOverrideCandidatesForField(
          field,
          new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd'),
          namespaceMap,
        );

        // In Entry.xsd, DerivedStringType extends BaseStringType -> must be offered
        expect(candidates['tns:DerivedStringType']).toBeDefined();
        expect(candidates['tns:DerivedStringType'].displayName).toBe('DerivedStringType');

        // In Entry.xsd, UnrelatedCandidate extends xs:int (not BaseStringType) -> must NOT be offered
        expect(candidates['tns:UnrelatedCandidate']).toBeUndefined();
      });

      it('should prefer entry-scoped member declaration for getSubstitutionGroupMembers when entrySchemaFile is provided', () => {
        const ns = 'http://www.example.com/SUBSTITUTION';
        const unrelatedXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}">
  <xs:element name="Cat" type="xs:string" substitutionGroup="tns:AbstractAnimal" xmlns:tns="${ns}"/>
</xs:schema>`;
        const def = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'substitution-scope-test',
          { 'Unrelated.xsd': unrelatedXsd, 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
          undefined,
          undefined,
          undefined,
          undefined,
          'FieldSubstitution.xsd',
        );
        const result = XmlSchemaDocumentService.createXmlSchemaDocument(def);
        const doc = result.document as XmlSchemaDocument;
        const headElement = new XmlSchemaAssembly(doc.xmlSchemaCollection, 'FieldSubstitution.xsd').lookupElement(
          new QName(ns, 'AbstractAnimal'),
        );

        expect(headElement).toBeDefined();
        const members = XmlSchemaTypesService.getSubstitutionGroupMembers(
          headElement!,
          new XmlSchemaAssembly(doc.xmlSchemaCollection, 'FieldSubstitution.xsd'),
        );

        const catMember = members.find((m) => m.getWireName()?.getLocalPart() === 'Cat');
        expect(catMember).toBeDefined();
        // The member resolved in FieldSubstitution.xsd has schema type AnimalType (complex), not xs:string (from Unrelated.xsd)
        expect(catMember!.getSchemaType()).toBeInstanceOf(XmlSchemaComplexType);
      });

      it('should exclude abstract entry-scoped members even if unrelated schema declares them as concrete', () => {
        const ns = 'http://www.example.com/SUBST_ABSTRACT';
        const unrelatedXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:element name="Head" type="xs:string"/>
  <xs:element name="Member" type="xs:string" substitutionGroup="tns:Head"/>
</xs:schema>`;
        const entryXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:element name="Head" type="xs:string"/>
  <xs:element name="Member" type="xs:string" abstract="true" substitutionGroup="tns:Head"/>
</xs:schema>`;

        const def = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'subst-abstract-test',
          { 'Unrelated.xsd': unrelatedXsd, 'Entry.xsd': entryXsd },
          undefined,
          undefined,
          undefined,
          undefined,
          'Entry.xsd',
        );
        const doc = XmlSchemaDocumentService.createXmlSchemaDocument(def).document as XmlSchemaDocument;
        const head = new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd').lookupElement(new QName(ns, 'Head'));
        expect(head).toBeDefined();

        const members = XmlSchemaTypesService.getSubstitutionGroupMembers(
          head!,
          new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd'),
        );
        expect(members.find((m) => m.getWireName()?.getLocalPart() === 'Member')).toBeUndefined();
      });

      it('should include concrete entry-scoped members even if unrelated schema declares them as abstract', () => {
        const ns = 'http://www.example.com/SUBST_CONCRETE';
        const unrelatedXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:element name="Head" type="xs:string"/>
  <xs:element name="Member" type="xs:string" abstract="true" substitutionGroup="tns:Head"/>
</xs:schema>`;
        const entryXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:element name="Head" type="xs:string"/>
  <xs:element name="Member" type="xs:string" abstract="false" substitutionGroup="tns:Head"/>
</xs:schema>`;

        const def = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'subst-concrete-test',
          { 'Unrelated.xsd': unrelatedXsd, 'Entry.xsd': entryXsd },
          undefined,
          undefined,
          undefined,
          undefined,
          'Entry.xsd',
        );
        const doc = XmlSchemaDocumentService.createXmlSchemaDocument(def).document as XmlSchemaDocument;
        const head = new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd').lookupElement(new QName(ns, 'Head'));
        expect(head).toBeDefined();

        const members = XmlSchemaTypesService.getSubstitutionGroupMembers(
          head!,
          new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd'),
        );
        expect(members.find((m) => m.getWireName()?.getLocalPart() === 'Member')).toBeDefined();
      });

      it('should not offer a member whose entry declaration has no substitutionGroup even if unrelated schema has it', () => {
        const ns = 'urn:s';
        const unrelatedXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:element name="Head" type="xs:string"/>
  <xs:element name="M" type="xs:string" substitutionGroup="tns:Head"/>
</xs:schema>`;
        const entryXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:element name="Head" type="xs:string"/>
  <xs:element name="M" type="xs:int"/>
</xs:schema>`;

        const def = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'subst-nonmember-test',
          { 'Unrelated.xsd': unrelatedXsd, 'Entry.xsd': entryXsd },
          undefined,
          undefined,
          undefined,
          undefined,
          'Entry.xsd',
        );
        const doc = XmlSchemaDocumentService.createXmlSchemaDocument(def).document as XmlSchemaDocument;
        const head = new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd').lookupElement(new QName(ns, 'Head'));
        expect(head).toBeDefined();

        const members = XmlSchemaTypesService.getSubstitutionGroupMembers(
          head!,
          new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd'),
        );
        expect(members).toHaveLength(0);
      });

      it('should list a member declared in several schemas only once', () => {
        const ns = 'urn:dup';
        const schemaXsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${ns}" xmlns:tns="${ns}">
  <xs:element name="Head" type="xs:string"/>
  <xs:element name="Member" type="xs:string" substitutionGroup="tns:Head"/>
</xs:schema>`;

        const def = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'subst-duplicate-test',
          { 'Other.xsd': schemaXsd, 'Entry.xsd': schemaXsd },
          undefined,
          undefined,
          undefined,
          undefined,
          'Entry.xsd',
        );
        const doc = XmlSchemaDocumentService.createXmlSchemaDocument(def).document as XmlSchemaDocument;
        const head = new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd').lookupElement(new QName(ns, 'Head'));
        expect(head).toBeDefined();

        const members = XmlSchemaTypesService.getSubstitutionGroupMembers(
          head!,
          new XmlSchemaAssembly(doc.xmlSchemaCollection, 'Entry.xsd'),
        );
        expect(members.filter((m) => m.getWireName()?.getLocalPart() === 'Member')).toHaveLength(1);
      });
    });
  });
});
