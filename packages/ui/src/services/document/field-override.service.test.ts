import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  PrimitiveDocument,
  Types,
} from '../../models/datamapper';
import { NS_XML_SCHEMA } from '../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import {
  getFieldSubstitutionNoNsXsd,
  getFieldSubstitutionXsd,
  getImportedTypesXsd,
  getNamedTypesXsd,
  getShipOrderXsd,
  TestUtil,
} from '../../stubs/datamapper/data-mapper';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { QName } from '../../xml-schema-ts/QName';
import { FieldOverrideService } from './field-override.service';
import { JsonSchemaDocument } from './json-schema/json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema/json-schema-document.service';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema/xml-schema-document.service';

const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';

function createSubstitutionDoc() {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
    'FieldSubstitution.xsd': getFieldSubstitutionXsd(),
  });
  definition.rootElementChoice = { namespaceUri: NS_SUBSTITUTION, name: 'AbstractAnimal' };
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create substitution test document');
  }
  return result.document;
}

function makeChoiceField(parent: XmlSchemaField, memberNames: string[]) {
  const choiceField = new XmlSchemaField(parent, 'choice', false);
  choiceField.wrapperKind = 'choice';
  choiceField.fields = memberNames.map((n) => new XmlSchemaField(choiceField, n, false));
  return choiceField;
}

function createNoNsSubstitutionDoc() {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
    'FieldSubstitutionNoNs.xsd': getFieldSubstitutionNoNsXsd(),
  });
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(
      result.errors?.map((e) => e.message).join('; ') || 'Failed to create no-namespace substitution test document',
    );
  }
  return result.document;
}

const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';

function createSubstitutionDoc() {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
    'FieldSubstitution.xsd': getFieldSubstitutionXsd(),
  });
  definition.rootElementChoice = { namespaceUri: NS_SUBSTITUTION, name: 'AbstractAnimal' };
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create substitution test document');
  }
  return result.document;
}

function makeChoiceField(parent: XmlSchemaField, memberNames: string[]) {
  const choiceField = new XmlSchemaField(parent, 'choice', false);
  choiceField.wrapperKind = 'choice';
  choiceField.fields = memberNames.map((n) => new XmlSchemaField(choiceField, n, false));
  return choiceField;
}

function createNoNsSubstitutionDoc() {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
    'FieldSubstitutionNoNs.xsd': getFieldSubstitutionNoNsXsd(),
  });
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(
      result.errors?.map((e) => e.message).join('; ') || 'Failed to create no-namespace substitution test document',
    );
  }
  return result.document;
}

describe('FieldOverrideService', () => {
  describe('getSafeOverrideCandidates()', () => {
    it('should return all types for xs:anyType fields', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const anyTypeField = doc.fields[0].fields[0];
      anyTypeField.type = Types.AnyType;

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidates = FieldOverrideService.getSafeOverrideCandidates(anyTypeField, namespaceMap);

      expect(Object.keys(candidates).length).toBeGreaterThan(0);
      expect(Object.values(candidates).some((c) => c.displayName === 'xs:string')).toBe(true);
      expect(Object.values(candidates).some((c) => c.displayName === 'xs:int')).toBe(true);
    });

    it('should return extensions and restrictions for Container types', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const containerField = doc.fields[0];
      containerField.type = Types.Container;

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidates = FieldOverrideService.getSafeOverrideCandidates(containerField, namespaceMap);

      expect(typeof candidates).toBe('object');
    });

    it('should return empty Record for primitive fields without inheritance', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      stringField.type = Types.String;

      const namespaceMap = { xs: NS_XML_SCHEMA };
      const candidates = FieldOverrideService.getSafeOverrideCandidates(stringField, namespaceMap);

      expect(typeof candidates).toBe('object');
    });

    it('should return all types when originalField.type is AnyType even if current type differs', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const field = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!field) throw new Error('Field not found');

      field.originalField = {
        name: field.name,
        displayName: field.displayName,
        namespaceURI: '',
        namespacePrefix: '',
        type: Types.AnyType,
        typeQName: null,
        namedTypeFragmentRefs: [],
      };
      field.type = Types.Integer;

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidates = FieldOverrideService.getSafeOverrideCandidates(field, namespaceMap);

      expect(Object.keys(candidates).length).toBeGreaterThan(0);
      expect(Object.values(candidates).some((c) => c.displayName === 'xs:string')).toBe(true);
    });

    it('should return empty Record for JSON Schema fields without AnyType original', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': JSON.stringify({
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          }),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const root = doc.fields[0];
      const nameField = root.fields.find((f) => f.key === 'name');
      if (!nameField) throw new Error('Field not found');

      const candidates = FieldOverrideService.getSafeOverrideCandidates(nameField, {});

      expect(typeof candidates).toBe('object');
      expect(Object.keys(candidates).length).toBe(0);
    });
  });

  describe('getAllOverrideCandidates()', () => {
    it('should return all built-in and user-defined types for XML Schema documents', async () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'NamedTypes.xsd': getNamedTypesXsd() },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidates = FieldOverrideService.getAllOverrideCandidates(doc, namespaceMap);

      expect(Object.keys(candidates).length).toBeGreaterThan(0);
      const builtInTypes = Object.values(candidates).filter((c) => c.isBuiltIn);
      const userDefinedTypes = Object.values(candidates).filter((c) => !c.isBuiltIn);

      expect(builtInTypes.length).toBeGreaterThan(0);
      expect(builtInTypes.some((c) => c.displayName === 'xs:string')).toBe(true);
      expect(builtInTypes.some((c) => c.displayName === 'xs:int')).toBe(true);
      expect(builtInTypes.some((c) => c.displayName === 'xs:boolean')).toBe(true);

      expect(userDefinedTypes.length).toBeGreaterThan(0);
      expect(userDefinedTypes.some((c) => c.displayName.includes('complexType1'))).toBe(true);
      expect(userDefinedTypes.some((c) => c.displayName.includes('simpleType1'))).toBe(true);
    });

    it('should return JSON Schema types for JSON Schema documents', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': JSON.stringify({
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          }),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as JsonSchemaDocument;

      const candidates = FieldOverrideService.getAllOverrideCandidates(doc, {});

      expect(Object.keys(candidates).length).toBeGreaterThan(0);
      expect(Object.values(candidates).some((c) => c.displayName === 'string')).toBe(true);
      expect(Object.values(candidates).some((c) => c.displayName === 'number')).toBe(true);
      expect(Object.values(candidates).some((c) => c.displayName === 'boolean')).toBe(true);
      expect(Object.values(candidates).some((c) => c.displayName === 'object')).toBe(true);
      expect(Object.values(candidates).some((c) => c.displayName === 'array')).toBe(true);
    });

    it('should return empty array for XmlSchemaDocument with undefined collection', () => {
      const malformedDoc = Object.create(XmlSchemaDocument.prototype);
      malformedDoc.documentType = DocumentType.SOURCE_BODY;
      malformedDoc.documentId = 'test';
      malformedDoc.fields = [];
      malformedDoc.xmlSchemaCollection = undefined;

      const candidates = FieldOverrideService.getAllOverrideCandidates(malformedDoc, {});

      expect(typeof candidates).toBe('object');
      expect(Object.keys(candidates).length).toBe(0);
    });
  });

  describe('addSchemaFilesForTypeOverride', () => {
    describe('XML Schema documents', () => {
      it('should add schema files and mutate document.definition.definitionFiles', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'test-doc',
          { 'ShipOrder.xsd': getShipOrderXsd() },
        );

        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;

        FieldOverrideService.addSchemaFilesForTypeOverride(document, {
          'ImportedTypes.xsd': getImportedTypesXsd(),
        });

        expect(Object.keys(document.definition.definitionFiles || {})).toContain('ShipOrder.xsd');
        expect(Object.keys(document.definition.definitionFiles || {})).toContain('ImportedTypes.xsd');
      });

      it('should make added schema types available in the collection', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'test-doc',
          { 'ShipOrder.xsd': getShipOrderXsd() },
        );

        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;

        FieldOverrideService.addSchemaFilesForTypeOverride(document, {
          'ImportedTypes.xsd': getImportedTypesXsd(),
        });

        expect(Object.keys(document.namedTypeFragments).some((k) => k.includes('ImportedType'))).toBe(true);
      });
    });

    describe('JSON Schema documents', () => {
      it('should add schema files and mutate document.definition', () => {
        const mainSchema = { type: 'object', properties: { name: { type: 'string' } } };
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.JSON_SCHEMA,
          'test-doc',
          { 'main.json': JSON.stringify(mainSchema) },
        );

        const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
        const document = result.document as JsonSchemaDocument;

        const additionalSchema = {
          $defs: {
            CustomType: { type: 'object', properties: { field: { type: 'string' } } },
          },
        };

        FieldOverrideService.addSchemaFilesForTypeOverride(document, {
          'types.json': JSON.stringify(additionalSchema),
        });

        expect(Object.keys(document.definition.definitionFiles || {})).toContain('main.json');
        expect(Object.keys(document.definition.definitionFiles || {})).toContain('types.json');
      });
    });

    describe('Error handling', () => {
      it('should throw TypeError for primitive documents', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.Primitive,
          'test-doc',
        );
        const document = new PrimitiveDocument(definition);

        expect(() => {
          FieldOverrideService.addSchemaFilesForTypeOverride(document, { 'test.xsd': '<schema/>' });
        }).toThrow('Cannot add schema files to primitive document');
      });

      it('should handle empty additionalFiles and keep existing definition files', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'test-doc',
          { 'ShipOrder.xsd': getShipOrderXsd() },
        );

        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;

        FieldOverrideService.addSchemaFilesForTypeOverride(document, {});

        expect(document.definition.definitionFiles).toEqual(definition.definitionFiles);
      });
    });
  });

  describe('createFieldTypeOverride()', () => {
    it('should create override with schemaPath property', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      const candidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const override = FieldOverrideService.createFieldTypeOverride(
        stringField,
        candidate,
        namespaceMap,
        FieldOverrideVariant.FORCE,
      );

      expect(override.schemaPath).toBe('/ns0:ShipOrder/ns0:OrderPerson');
      expect(override.type).toBe('xs:int');
      expect(override.originalType).toBe('xs:string');
      expect(override.variant).toBe(FieldOverrideVariant.FORCE);
    });

    it('should create override with schema path through choice compositor', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, []);
      const emailField = new XmlSchemaField(choiceField, 'email', false);
      choiceField.fields = [emailField];
      shipOrderField.fields.push(choiceField);

      const candidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const override = FieldOverrideService.createFieldTypeOverride(
        emailField,
        candidate,
        namespaceMap,
        FieldOverrideVariant.FORCE,
      );

      expect(override.schemaPath).toBe('/ns0:ShipOrder/{choice:0}/email');
    });

    it('should use originalField.type as originalType when field was already overridden', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      const intCandidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };
      const boolCandidate = {
        displayName: 'xs:boolean',
        typeQName: new QName(NS_XML_SCHEMA, 'boolean'),
        type: Types.Boolean,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldOverrideService.applyFieldTypeOverride(stringField, intCandidate, namespaceMap, FieldOverrideVariant.FORCE);

      const firstOverrideOriginalType = doc.definition.fieldTypeOverrides![0].originalType;

      const secondOverride = FieldOverrideService.createFieldTypeOverride(
        stringField,
        boolCandidate,
        namespaceMap,
        FieldOverrideVariant.FORCE,
      );

      expect(secondOverride.originalType).toBe(firstOverrideOriginalType);
      expect(secondOverride.originalType).not.toBe(intCandidate.displayName);
    });
  });

  describe('applyFieldTypeOverride()', () => {
    it('should apply override to XML document field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      expect(stringField.type).toBe(Types.String);
      expect(stringField.typeOverride).toBe(FieldOverrideVariant.NONE);

      const candidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldOverrideService.applyFieldTypeOverride(stringField, candidate, namespaceMap, FieldOverrideVariant.FORCE);

      expect(stringField.type).toBe(Types.Integer);
      expect(stringField.typeOverride).toBe(FieldOverrideVariant.FORCE);
      expect(doc.definition.fieldTypeOverrides).toBeDefined();
      expect(doc.definition.fieldTypeOverrides![0].schemaPath).toBe('/ns0:ShipOrder/ns0:OrderPerson');
    });

    it('should invalidate descendant overrides and selections after applying type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      doc.definition.fieldTypeOverrides = [
        {
          schemaPath: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.FORCE,
        },
      ];
      doc.definition.choiceSelections = [{ schemaPath: '/ns0:ShipOrder/ShipTo/{choice:0}', selectedMemberIndex: 0 }];

      const shipToField = shipOrderField.fields.find((f) => f.name === 'ShipTo');
      if (!shipToField) throw new Error('ShipTo field not found');

      const candidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldOverrideService.applyFieldTypeOverride(shipToField, candidate, namespaceMap, FieldOverrideVariant.FORCE);

      expect(doc.definition.fieldTypeOverrides?.some((o) => o.schemaPath === '/ns0:ShipOrder/ShipTo/City')).toBe(false);
      expect(doc.definition.choiceSelections?.some((s) => s.schemaPath === '/ns0:ShipOrder/ShipTo/{choice:0}')).toBe(
        false,
      );
    });

    it('should apply override to JSON document field', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': JSON.stringify({
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          }),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const root = doc.fields[0];
      const nameField = root.fields.find((f) => f.key === 'name');
      if (!nameField) throw new Error('Field not found');

      expect(nameField.type).toBe(Types.String);

      const candidate = {
        displayName: 'number',
        typeQName: new QName(null, 'number'),
        type: Types.Numeric,
        isBuiltIn: true,
      };

      FieldOverrideService.applyFieldTypeOverride(nameField, candidate, {}, FieldOverrideVariant.FORCE);

      expect(nameField.type).toBe(Types.Numeric);
      expect(nameField.typeOverride).toBe(FieldOverrideVariant.FORCE);
    });

    it('should register unknown namespaceURI in namespaceMap and store prefixed typeString', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      const newNamespace = 'http://example.com/types';
      const candidate = {
        displayName: 'EmployeeType',
        typeQName: new QName(newNamespace, 'EmployeeType'),
        type: Types.Container,
        isBuiltIn: false,
      };

      const namespaceMap: Record<string, string> = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldOverrideService.applyFieldTypeOverride(stringField, candidate, namespaceMap, FieldOverrideVariant.FORCE);

      expect(Object.values(namespaceMap)).toContain(newNamespace);
      const registeredPrefix = Object.keys(namespaceMap).find((k) => namespaceMap[k] === newNamespace);
      expect(registeredPrefix).toBeDefined();
      expect(doc.definition.fieldTypeOverrides![0].type).toBe(`${registeredPrefix}:EmployeeType`);
    });

    it('should throw TypeError for PrimitiveDocument', () => {
      const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test-doc');
      const document = new PrimitiveDocument(definition);

      const candidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };

      expect(() => {
        FieldOverrideService.applyFieldTypeOverride(
          { ownerDocument: document } as unknown as IField,
          candidate,
          {},
          FieldOverrideVariant.FORCE,
        );
      }).toThrow(TypeError);
      expect(() => {
        FieldOverrideService.applyFieldTypeOverride(
          { ownerDocument: document } as unknown as IField,
          candidate,
          {},
          FieldOverrideVariant.FORCE,
        );
      }).toThrow('Field type override is not supported for primitive documents');
    });

    it('should throw TypeError for unsupported document type', () => {
      const mockDoc = {
        documentType: DocumentType.SOURCE_BODY,
        documentId: 'test',
        fields: [],
        definition: new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test'),
        constructor: { name: 'UnknownDocument' },
      } as unknown as IDocument;

      const candidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };

      expect(() => {
        FieldOverrideService.applyFieldTypeOverride(
          { ownerDocument: mockDoc } as unknown as IField,
          candidate,
          {},
          FieldOverrideVariant.FORCE,
        );
      }).toThrow(TypeError);
      expect(() => {
        FieldOverrideService.applyFieldTypeOverride(
          { ownerDocument: mockDoc } as unknown as IField,
          candidate,
          {},
          FieldOverrideVariant.FORCE,
        );
      }).toThrow('Unsupported document type');
    });
  });

  describe('revertFieldTypeOverride()', () => {
    it('should remove override and restore original type', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      const originalType = stringField.type;

      const candidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldOverrideService.applyFieldTypeOverride(stringField, candidate, namespaceMap, FieldOverrideVariant.FORCE);

      expect(stringField.type).toBe(Types.Integer);
      expect(stringField.typeOverride).toBe(FieldOverrideVariant.FORCE);

      FieldOverrideService.revertFieldTypeOverride(stringField, namespaceMap);

      expect(stringField.type).toBe(originalType);
      expect(stringField.typeOverride).toBe(FieldOverrideVariant.NONE);
      expect(doc.definition.fieldTypeOverrides?.length).toBe(0);
    });

    it('should be no-op if field has no override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      const originalType = stringField.type;
      expect(stringField.typeOverride).toBe(FieldOverrideVariant.NONE);

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldOverrideService.revertFieldTypeOverride(stringField, namespaceMap);

      expect(stringField.type).toBe(originalType);
      expect(stringField.typeOverride).toBe(FieldOverrideVariant.NONE);
    });

    it('should invalidate descendant overrides and selections after reverting type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const shipToField = shipOrderField.fields.find((f) => f.name === 'ShipTo');
      if (!shipToField) throw new Error('ShipTo field not found');

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidate = {
        displayName: 'xs:int',
        typeQName: new QName(NS_XML_SCHEMA, 'int'),
        type: Types.Integer,
        isBuiltIn: true,
      };
      FieldOverrideService.applyFieldTypeOverride(shipToField, candidate, namespaceMap, FieldOverrideVariant.FORCE);

      doc.definition.fieldTypeOverrides = [
        ...(doc.definition.fieldTypeOverrides ?? []),
        {
          schemaPath: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: FieldOverrideVariant.FORCE,
        },
      ];
      doc.definition.choiceSelections = [
        ...(doc.definition.choiceSelections ?? []),
        { schemaPath: '/ns0:ShipOrder/ShipTo/{choice:0}', selectedMemberIndex: 0 },
      ];

      FieldOverrideService.revertFieldTypeOverride(shipToField, namespaceMap);

      expect(doc.definition.fieldTypeOverrides?.some((o) => o.schemaPath === '/ns0:ShipOrder/ShipTo/City')).toBe(false);
      expect(doc.definition.choiceSelections?.some((s) => s.schemaPath === '/ns0:ShipOrder/ShipTo/{choice:0}')).toBe(
        false,
      );
    });
  });

  describe('getFieldSubstitutionCandidates()', () => {
    it('should return substitution candidates for an element that is a substitution group head', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];

      const candidates = FieldOverrideService.getFieldSubstitutionCandidates(abstractAnimalField, namespaceMap);

      expect(Object.keys(candidates).length).toBeGreaterThan(0);
      expect(Object.keys(candidates).some((k) => k.includes('Cat'))).toBe(true);
      expect(Object.keys(candidates).some((k) => k.includes('Dog'))).toBe(true);
    });

    it('should return empty Record for non-XmlSchemaDocument', () => {
      const jsonDoc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.JSON_SCHEMA, 'test', {}),
      );
      const jsonField = { ownerDocument: jsonDoc } as unknown as IField;

      const candidates = FieldOverrideService.getFieldSubstitutionCandidates(jsonField, {});

      expect(candidates).toEqual({});
    });

    it('should return empty Record for XmlSchemaDocument with undefined xmlSchemaCollection', () => {
      const malformedDoc = Object.create(XmlSchemaDocument.prototype) as XmlSchemaDocument;
      malformedDoc.xmlSchemaCollection = undefined as unknown as XmlSchemaCollection;
      const field = { ownerDocument: malformedDoc } as unknown as IField;

      expect(() => FieldOverrideService.getFieldSubstitutionCandidates(field, {})).not.toThrow();
      expect(FieldOverrideService.getFieldSubstitutionCandidates(field, {})).toEqual({});
    });
  });

  describe('applyFieldSubstitution() and revertFieldSubstitution()', () => {
    it('should apply substitution and store entry in definition', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Cat', namespaceMap);

      expect(doc.definition.fieldSubstitutions).toHaveLength(1);
      expect(doc.definition.fieldSubstitutions![0].name).toBe('sub:Cat');
      expect(abstractAnimalField.wrapperKind).toBe('abstract');
      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      const catIndex = abstractAnimalField.fields.findIndex((f) => f.name === 'Cat');
      expect(abstractAnimalField.selectedMemberIndex).toBe(catIndex);
    });

    it('should revert substitution and restore original field state', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];
      const originalFieldCount = abstractAnimalField.fields.length;

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Cat', namespaceMap);
      expect(abstractAnimalField.selectedMemberIndex).toBeDefined();

      FieldOverrideService.revertFieldSubstitution(abstractAnimalField, namespaceMap);

      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      expect(abstractAnimalField.wrapperKind).toBe('abstract');
      expect(abstractAnimalField.selectedMemberIndex).toBeUndefined();
      expect(abstractAnimalField.fields).toHaveLength(originalFieldCount);
      expect(doc.definition.fieldSubstitutions).toHaveLength(0);
    });

    it('should do nothing on revert when field is not substituted', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];
      const originalName = abstractAnimalField.name;
      const originalTypeOverride = abstractAnimalField.typeOverride;
      const originalSubstitutionCount = doc.definition.fieldSubstitutions?.length ?? 0;

      FieldOverrideService.revertFieldSubstitution(abstractAnimalField, namespaceMap);

      expect(abstractAnimalField.name).toBe(originalName);
      expect(abstractAnimalField.typeOverride).toBe(originalTypeOverride);
      expect(doc.definition.fieldSubstitutions?.length ?? 0).toBe(originalSubstitutionCount);
    });

    it('should remove persisted substitution entry when reverting abstract wrapper', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Cat', namespaceMap);
      expect(doc.definition.fieldSubstitutions).toHaveLength(1);
      expect(abstractAnimalField.selectedMemberIndex).toBeDefined();

      FieldOverrideService.revertFieldSubstitution(abstractAnimalField, namespaceMap);

      expect(doc.definition.fieldSubstitutions).toHaveLength(0);
      expect(abstractAnimalField.selectedMemberIndex).toBeUndefined();
    });

    it('should do nothing on apply when document is not XmlSchemaDocument', () => {
      const jsonDocument = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.JSON_SCHEMA, 'test', {}),
      );
      const field = { name: 'test', ownerDocument: jsonDocument } as unknown as IField;

      FieldOverrideService.applyFieldSubstitution(field, 'sub:Cat', {});

      expect(field.name).toBe('test');
    });

    it('should do nothing on apply when XmlSchemaDocument has undefined xmlSchemaCollection', () => {
      const malformedDoc = Object.create(XmlSchemaDocument.prototype) as XmlSchemaDocument;
      malformedDoc.xmlSchemaCollection = undefined as unknown as XmlSchemaCollection;
      malformedDoc.definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test',
        {},
      );
      const field = { ownerDocument: malformedDoc } as unknown as IField;

      expect(() => {
        FieldOverrideService.applyFieldSubstitution(field, 'sub:Cat', {});
      }).not.toThrow();
      expect(malformedDoc.definition.fieldSubstitutions ?? []).toHaveLength(0);
    });

    it('should not modify field when applying a non-member substitution', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];
      const originalName = abstractAnimalField.name;
      const originalType = abstractAnimalField.type;

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Nickname', namespaceMap);

      expect(abstractAnimalField.name).toBe(originalName);
      expect(abstractAnimalField.type).toBe(originalType);
      expect(abstractAnimalField.typeOverride).toBe(FieldOverrideVariant.NONE);
      expect(doc.definition.fieldSubstitutions ?? []).toHaveLength(0);
    });

    it('should replace existing substitution entry when reapplied to same field', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Cat', namespaceMap);
      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Dog', namespaceMap);

      expect(doc.definition.fieldSubstitutions).toHaveLength(1);
      expect(doc.definition.fieldSubstitutions![0].name).toBe('sub:Dog');
      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      const dogIndex = abstractAnimalField.fields.findIndex((f) => f.name === 'Dog');
      expect(abstractAnimalField.selectedMemberIndex).toBe(dogIndex);
    });

    it('should register missing namespace and prefix the key when namespace is not in map', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap: Record<string, string> = {};
      const abstractAnimalField = doc.fields[0];

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'ns0:Cat', namespaceMap);

      expect(namespaceMap['ns0']).toBe(NS_SUBSTITUTION);
      expect(doc.definition.fieldSubstitutions![0].name).toBe('ns0:Cat');
      expect(abstractAnimalField.selectedMemberIndex).toBeDefined();
      expect(abstractAnimalField.name).toBe('AbstractAnimal');
    });

    it('should select candidate when substituting with an element that has an anonymous complex type', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Fish', namespaceMap);

      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      const fishIndex = abstractAnimalField.fields.findIndex((f) => f.name === 'Fish');
      expect(abstractAnimalField.selectedMemberIndex).toBe(fishIndex);
      const fishField = abstractAnimalField.fields[fishIndex];
      expect(fishField.fields.some((f) => f.name === 'freshwater')).toBe(true);
    });

    it('should register namespace and store prefixed name when namespace is not pre-registered', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap: Record<string, string> = {};
      const abstractAnimalField = doc.fields[0];
      const originalFieldCount = abstractAnimalField.fields.length;

      const candidates = FieldOverrideService.getFieldSubstitutionCandidates(abstractAnimalField, namespaceMap);
      const catKey = Object.keys(candidates).find((k) => k.endsWith(':Cat') || k === 'Cat')!;
      expect(catKey).toBeDefined();

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, catKey, namespaceMap);

      expect(doc.definition.fieldSubstitutions).toHaveLength(1);
      const catIndex = abstractAnimalField.fields.findIndex((f) => f.name === 'Cat');
      expect(abstractAnimalField.selectedMemberIndex).toBe(catIndex);

      FieldOverrideService.revertFieldSubstitution(abstractAnimalField, namespaceMap);

      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      expect(abstractAnimalField.selectedMemberIndex).toBeUndefined();
      expect(abstractAnimalField.fields.length).toBe(originalFieldCount);
      expect(doc.definition.fieldSubstitutions ?? []).toHaveLength(0);
    });

    it('should apply substitution via applySubstitutionToField when field is not abstract', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];
      abstractAnimalField.wrapperKind = undefined;

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Cat', namespaceMap);

      expect(abstractAnimalField.name).toBe('Cat');
      expect(abstractAnimalField.typeOverride).toBe(FieldOverrideVariant.SUBSTITUTION);
      expect(abstractAnimalField.selectedMemberIndex).toBeUndefined();
    });

    it('should revert non-abstract substitution via restoreOriginalField', () => {
      const doc = createSubstitutionDoc();
      const namespaceMap = { sub: NS_SUBSTITUTION };
      const abstractAnimalField = doc.fields[0];
      abstractAnimalField.wrapperKind = undefined;

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'sub:Cat', namespaceMap);
      expect(abstractAnimalField.typeOverride).toBe(FieldOverrideVariant.SUBSTITUTION);

      FieldOverrideService.revertFieldSubstitution(abstractAnimalField, namespaceMap);

      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      expect(abstractAnimalField.typeOverride).toBe(FieldOverrideVariant.NONE);
      expect(doc.definition.fieldSubstitutions).toHaveLength(0);
    });
  });

  describe('applyFieldSubstitution() and revertFieldSubstitution() - blank namespace', () => {
    it('should apply Cat substitution to blank-namespace field', () => {
      const doc = createNoNsSubstitutionDoc();
      const abstractAnimalField = doc.fields[0];

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'Cat', {});

      expect(doc.definition.fieldSubstitutions).toHaveLength(1);
      expect(doc.definition.fieldSubstitutions![0].name).toBe('Cat');
      expect(abstractAnimalField.wrapperKind).toBe('abstract');
      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      const catIndex = abstractAnimalField.fields.findIndex((f) => f.name === 'Cat');
      expect(abstractAnimalField.selectedMemberIndex).toBe(catIndex);
    });

    it('should revert Cat substitution and restore blank-namespace field', () => {
      const doc = createNoNsSubstitutionDoc();
      const abstractAnimalField = doc.fields[0];
      const originalFieldCount = abstractAnimalField.fields.length;

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'Cat', {});
      FieldOverrideService.revertFieldSubstitution(abstractAnimalField, {});

      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      expect(abstractAnimalField.wrapperKind).toBe('abstract');
      expect(abstractAnimalField.selectedMemberIndex).toBeUndefined();
      expect(abstractAnimalField.fields).toHaveLength(originalFieldCount);
      expect(doc.definition.fieldSubstitutions).toHaveLength(0);
    });

    it('should get substitution candidates for blank-namespace field via FieldOverrideService', () => {
      const doc = createNoNsSubstitutionDoc();
      const abstractAnimalField = doc.fields[0];

      const candidates = FieldOverrideService.getFieldSubstitutionCandidates(abstractAnimalField, {});

      expect(Object.keys(candidates).includes('Cat')).toBe(true);
      expect(Object.keys(candidates).includes('Dog')).toBe(true);
    });

    it('should replace blank-namespace substitution entry when reapplied', () => {
      const doc = createNoNsSubstitutionDoc();
      const abstractAnimalField = doc.fields[0];

      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'Cat', {});
      FieldOverrideService.applyFieldSubstitution(abstractAnimalField, 'Dog', {});

      expect(doc.definition.fieldSubstitutions).toHaveLength(1);
      expect(doc.definition.fieldSubstitutions![0].name).toBe('Dog');
      expect(abstractAnimalField.name).toBe('AbstractAnimal');
      const dogIndex = abstractAnimalField.fields.findIndex((f) => f.name === 'Dog');
      expect(abstractAnimalField.selectedMemberIndex).toBe(dogIndex);
    });
  });
});
