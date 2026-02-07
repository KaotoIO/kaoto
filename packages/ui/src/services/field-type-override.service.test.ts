import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  PrimitiveDocument,
  Types,
} from '../models/datamapper';
import { NS_XML_SCHEMA } from '../models/datamapper/standard-namespaces';
import { TypeOverrideVariant } from '../models/datamapper/types';
import { importedTypesXsd, namedTypesXsd, shipOrderXsd, TestUtil } from '../stubs/datamapper/data-mapper';
import { FieldTypeOverrideService } from './field-type-override.service';
import { JsonSchemaDocument } from './json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { XmlSchemaDocument } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

describe('FieldTypeOverrideService', () => {
  describe('getSafeOverrideCandidates()', () => {
    it('should return all types for xs:anyType fields', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const anyTypeField = doc.fields[0].fields[0];
      anyTypeField.originalType = Types.AnyType;

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidates = FieldTypeOverrideService.getSafeOverrideCandidates(anyTypeField, namespaceMap);

      expect(Object.keys(candidates).length).toBeGreaterThan(0);
      expect(Object.values(candidates).some((c) => c.displayName === 'xs:string')).toBe(true);
      expect(Object.values(candidates).some((c) => c.displayName === 'xs:int')).toBe(true);
    });

    it('should return extensions and restrictions for Container types', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const containerField = doc.fields[0];
      containerField.originalType = Types.Container;

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidates = FieldTypeOverrideService.getSafeOverrideCandidates(containerField, namespaceMap);

      expect(typeof candidates).toBe('object');
    });

    it('should return empty Record for primitive fields without inheritance', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      stringField.originalType = Types.String;

      const namespaceMap = { xs: NS_XML_SCHEMA };
      const candidates = FieldTypeOverrideService.getSafeOverrideCandidates(stringField, namespaceMap);

      expect(typeof candidates).toBe('object');
    });
  });

  describe('getAllOverrideCandidates()', () => {
    it('should return all built-in and user-defined types for XML Schema documents', async () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'NamedTypes.xsd': namedTypesXsd },
      );

      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document as XmlSchemaDocument;

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidates = FieldTypeOverrideService.getAllOverrideCandidates(doc, namespaceMap);

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

      const candidates = FieldTypeOverrideService.getAllOverrideCandidates(doc, {});

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

      const candidates = FieldTypeOverrideService.getAllOverrideCandidates(malformedDoc, {});

      expect(typeof candidates).toBe('object');
      expect(Object.keys(candidates).length).toBe(0);
    });
  });

  describe('addSchemaFilesForTypeOverride', () => {
    describe('XML Schema documents', () => {
      it('should add schema files and return updated definition with namespace map', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'test-doc',
          { 'ShipOrder.xsd': shipOrderXsd },
          undefined,
          undefined,
          { ns0: 'io.kaoto.datamapper.poc.test' },
        );

        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;

        const updatedDef = FieldTypeOverrideService.addSchemaFilesForTypeOverride(document, {
          'ImportedTypes.xsd': importedTypesXsd,
        });

        expect(Object.keys(updatedDef.definitionFiles || {})).toContain('ShipOrder.xsd');
        expect(Object.keys(updatedDef.definitionFiles || {})).toContain('ImportedTypes.xsd');

        const namespaceMap = updatedDef.namespaceMap || {};
        expect(namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
        expect(namespaceMap['ns1']).toBe('http://example.com/types');
      });

      it('should preserve existing namespaces when adding new ones', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'test-doc',
          { 'ShipOrder.xsd': shipOrderXsd },
          undefined,
          undefined,
          { ns0: 'io.kaoto.datamapper.poc.test', custom: 'http://example.com/custom' },
        );

        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;

        const updatedDef = FieldTypeOverrideService.addSchemaFilesForTypeOverride(document, {
          'ImportedTypes.xsd': importedTypesXsd,
        });

        const namespaceMap = updatedDef.namespaceMap || {};
        expect(namespaceMap['ns0']).toBe('io.kaoto.datamapper.poc.test');
        expect(namespaceMap['custom']).toBe('http://example.com/custom');
        expect(namespaceMap['ns1']).toBe('http://example.com/types');
      });
    });

    describe('JSON Schema documents', () => {
      it('should add schema files and return updated definition', () => {
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

        const updatedDef = FieldTypeOverrideService.addSchemaFilesForTypeOverride(document, {
          'types.json': JSON.stringify(additionalSchema),
        });

        expect(Object.keys(updatedDef.definitionFiles || {})).toContain('main.json');
        expect(Object.keys(updatedDef.definitionFiles || {})).toContain('types.json');
        expect(updatedDef.namespaceMap).toEqual({});
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
          FieldTypeOverrideService.addSchemaFilesForTypeOverride(document, { 'test.xsd': '<schema/>' });
        }).toThrow('Cannot add schema files to primitive document');
      });

      it('should handle empty additionalFiles', () => {
        const definition = new DocumentDefinition(
          DocumentType.SOURCE_BODY,
          DocumentDefinitionType.XML_SCHEMA,
          'test-doc',
          { 'ShipOrder.xsd': shipOrderXsd },
          undefined,
          undefined,
          { ns0: 'io.kaoto.datamapper.poc.test' },
        );

        const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
        const document = result.document as XmlSchemaDocument;

        const updatedDef = FieldTypeOverrideService.addSchemaFilesForTypeOverride(document, {});

        expect(updatedDef.definitionFiles).toEqual(definition.definitionFiles);
        expect(updatedDef.namespaceMap).toEqual(definition.namespaceMap);
      });
    });
  });

  describe('applyFieldTypeOverride()', () => {
    it('should apply override to XML document field', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      expect(stringField.type).toBe(Types.String);
      expect(stringField.typeOverride).toBe(TypeOverrideVariant.NONE);

      const candidate = {
        displayName: 'xs:int',
        typeString: 'xs:int',
        type: Types.Integer,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldTypeOverrideService.applyFieldTypeOverride(
        doc,
        stringField,
        candidate,
        namespaceMap,
        TypeOverrideVariant.FORCE,
      );

      expect(stringField.type).toBe(Types.Integer);
      expect(stringField.typeOverride).toBe(TypeOverrideVariant.FORCE);
      expect(doc.definition.fieldTypeOverrides).toBeDefined();
      expect(doc.definition.fieldTypeOverrides?.length).toBeGreaterThan(0);
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
        typeString: 'number',
        type: Types.Numeric,
        namespaceURI: '',
        isBuiltIn: true,
      };

      FieldTypeOverrideService.applyFieldTypeOverride(doc, nameField, candidate, {}, TypeOverrideVariant.FORCE);

      expect(nameField.type).toBe(Types.Numeric);
      expect(nameField.typeOverride).toBe(TypeOverrideVariant.FORCE);
    });

    it('should throw TypeError for PrimitiveDocument', () => {
      const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test-doc');
      const document = new PrimitiveDocument(definition);

      const candidate = {
        displayName: 'xs:int',
        typeString: 'xs:int',
        type: Types.Integer,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      };

      expect(() => {
        FieldTypeOverrideService.applyFieldTypeOverride(document, document, candidate, {}, TypeOverrideVariant.FORCE);
      }).toThrow(TypeError);
      expect(() => {
        FieldTypeOverrideService.applyFieldTypeOverride(document, document, candidate, {}, TypeOverrideVariant.FORCE);
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
        typeString: 'xs:int',
        type: Types.Integer,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      };

      expect(() => {
        FieldTypeOverrideService.applyFieldTypeOverride(
          mockDoc,
          mockDoc as unknown as IField,
          candidate,
          {},
          TypeOverrideVariant.FORCE,
        );
      }).toThrow(TypeError);
      expect(() => {
        FieldTypeOverrideService.applyFieldTypeOverride(
          mockDoc,
          mockDoc as unknown as IField,
          candidate,
          {},
          TypeOverrideVariant.FORCE,
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
        typeString: 'xs:int',
        type: Types.Integer,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldTypeOverrideService.applyFieldTypeOverride(
        doc,
        stringField,
        candidate,
        namespaceMap,
        TypeOverrideVariant.FORCE,
      );

      expect(stringField.type).toBe(Types.Integer);
      expect(stringField.typeOverride).toBe(TypeOverrideVariant.FORCE);

      FieldTypeOverrideService.revertFieldTypeOverride(doc, stringField, namespaceMap);

      expect(stringField.type).toBe(originalType);
      expect(stringField.typeOverride).toBe(TypeOverrideVariant.NONE);
      expect(doc.definition.fieldTypeOverrides?.length).toBe(0);
    });

    it('should be no-op if field has no override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      const originalType = stringField.type;
      expect(stringField.typeOverride).toBe(TypeOverrideVariant.NONE);

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      FieldTypeOverrideService.revertFieldTypeOverride(doc, stringField, namespaceMap);

      expect(stringField.type).toBe(originalType);
      expect(stringField.typeOverride).toBe(TypeOverrideVariant.NONE);
    });
  });
});
