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
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

describe('FieldTypeOverrideService', () => {
  function makeChoiceField(parent: XmlSchemaField, memberNames: string[]) {
    const choiceField = new XmlSchemaField(parent, 'choice', false);
    choiceField.isChoice = true;
    choiceField.fields = memberNames.map((n) => new XmlSchemaField(choiceField, n, false));
    return choiceField;
  }

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

  describe('createFieldTypeOverride()', () => {
    it('should create override with schemaPath property', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const stringField = doc.fields[0].fields.find((f) => f.name === 'OrderPerson');
      if (!stringField) throw new Error('Field not found');

      const candidate = {
        displayName: 'xs:int',
        typeString: 'xs:int',
        type: Types.Integer,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const override = FieldTypeOverrideService.createFieldTypeOverride(
        stringField,
        candidate,
        namespaceMap,
        TypeOverrideVariant.FORCE,
      );

      expect(override.schemaPath).toBe('/ns0:ShipOrder/ns0:OrderPerson');
      expect(override.type).toBe('xs:int');
      expect(override.variant).toBe(TypeOverrideVariant.FORCE);
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
        typeString: 'xs:int',
        type: Types.Integer,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      };

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const override = FieldTypeOverrideService.createFieldTypeOverride(
        emailField,
        candidate,
        namespaceMap,
        TypeOverrideVariant.FORCE,
      );

      expect(override.schemaPath).toBe('/ns0:ShipOrder/{choice:0}/email');
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
          variant: TypeOverrideVariant.FORCE,
        },
      ];
      doc.definition.choiceSelections = [{ schemaPath: '/ns0:ShipOrder/ShipTo/{choice:0}', selectedMemberIndex: 0 }];

      const shipToField = shipOrderField.fields.find((f) => f.name === 'ShipTo');
      if (!shipToField) throw new Error('ShipTo field not found');

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
        shipToField,
        candidate,
        namespaceMap,
        TypeOverrideVariant.FORCE,
      );

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

    it('should invalidate descendant overrides and selections after reverting type override', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const shipToField = shipOrderField.fields.find((f) => f.name === 'ShipTo');
      if (!shipToField) throw new Error('ShipTo field not found');

      const namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.datamapper.poc.test' };
      const candidate = {
        displayName: 'xs:int',
        typeString: 'xs:int',
        type: Types.Integer,
        namespaceURI: NS_XML_SCHEMA,
        isBuiltIn: true,
      };
      FieldTypeOverrideService.applyFieldTypeOverride(
        doc,
        shipToField,
        candidate,
        namespaceMap,
        TypeOverrideVariant.FORCE,
      );

      doc.definition.fieldTypeOverrides = [
        ...(doc.definition.fieldTypeOverrides ?? []),
        {
          schemaPath: '/ns0:ShipOrder/ShipTo/City',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];
      doc.definition.choiceSelections = [
        ...(doc.definition.choiceSelections ?? []),
        { schemaPath: '/ns0:ShipOrder/ShipTo/{choice:0}', selectedMemberIndex: 0 },
      ];

      FieldTypeOverrideService.revertFieldTypeOverride(doc, shipToField, namespaceMap);

      expect(doc.definition.fieldTypeOverrides?.some((o) => o.schemaPath === '/ns0:ShipOrder/ShipTo/City')).toBe(false);
      expect(doc.definition.choiceSelections?.some((s) => s.schemaPath === '/ns0:ShipOrder/ShipTo/{choice:0}')).toBe(
        false,
      );
    });
  });

  describe('applyChoiceSelection()', () => {
    const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

    it('should apply choice selection and update definition', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      FieldTypeOverrideService.applyChoiceSelection(doc, choiceField, 1, namespaceMap);

      expect(choiceField.selectedMemberIndex).toBe(1);
      expect(doc.definition.choiceSelections).toHaveLength(1);
      expect(doc.definition.choiceSelections![0].schemaPath).toBe('/ns0:ShipOrder/{choice:0}');
      expect(doc.definition.choiceSelections![0].selectedMemberIndex).toBe(1);
    });

    it('should update selection when re-applied with different index', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      FieldTypeOverrideService.applyChoiceSelection(doc, choiceField, 0, namespaceMap);
      FieldTypeOverrideService.applyChoiceSelection(doc, choiceField, 1, namespaceMap);

      expect(choiceField.selectedMemberIndex).toBe(1);
      expect(doc.definition.choiceSelections).toHaveLength(1);
    });

    it('should build correct path for directly nested choices', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const outerChoice = makeChoiceField(shipOrderField, []);
      const innerChoice = makeChoiceField(outerChoice, ['optA', 'optB']);
      outerChoice.fields = [innerChoice];
      shipOrderField.fields.push(outerChoice);

      FieldTypeOverrideService.applyChoiceSelection(doc, innerChoice, 0, namespaceMap);

      expect(doc.definition.choiceSelections![0].schemaPath).toBe('/ns0:ShipOrder/{choice:0}/{choice:0}');
    });

    it('should build correct index when non-choice fields are interspersed between choices', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const elementA = new XmlSchemaField(shipOrderField, 'ElementA', false);
      const choice0 = makeChoiceField(shipOrderField, ['optA', 'optB']);
      const elementB = new XmlSchemaField(shipOrderField, 'ElementB', false);
      const choice1 = makeChoiceField(shipOrderField, ['optX', 'optY']);
      shipOrderField.fields.push(elementA, choice0, elementB, choice1);

      FieldTypeOverrideService.applyChoiceSelection(doc, choice1, 0, namespaceMap);

      expect(doc.definition.choiceSelections![0].schemaPath).toBe('/ns0:ShipOrder/{choice:1}');
    });

    it('should invalidate descendant overrides and selections after applying choice selection', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      doc.definition.fieldTypeOverrides = [
        {
          schemaPath: '/ns0:ShipOrder/{choice:0}/email/emailAddress',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];
      doc.definition.choiceSelections = [
        { schemaPath: '/ns0:ShipOrder/{choice:0}/email/{choice:0}', selectedMemberIndex: 0 },
      ];

      FieldTypeOverrideService.applyChoiceSelection(doc, choiceField, 0, namespaceMap);

      expect(
        doc.definition.fieldTypeOverrides?.some((o) => o.schemaPath === '/ns0:ShipOrder/{choice:0}/email/emailAddress'),
      ).toBe(false);
      expect(
        doc.definition.choiceSelections?.some((s) => s.schemaPath === '/ns0:ShipOrder/{choice:0}/email/{choice:0}'),
      ).toBe(false);
      expect(doc.definition.choiceSelections?.some((s) => s.schemaPath === '/ns0:ShipOrder/{choice:0}')).toBe(true);
    });

    it('should be no-op when PrimitiveDocument is passed as the choice field', () => {
      const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, 'test-doc');
      const document = new PrimitiveDocument(definition);

      expect(() => {
        FieldTypeOverrideService.applyChoiceSelection(document, document as unknown as IField, 0, {});
      }).not.toThrow();
    });

    it('should be no-op when field is not a choice compositor', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const regularField = new XmlSchemaField(shipOrderField, 'email', false);
      shipOrderField.fields.push(regularField);

      FieldTypeOverrideService.applyChoiceSelection(doc, regularField, 0, namespaceMap);

      expect(regularField.selectedMemberIndex).toBeUndefined();
      expect(doc.definition.choiceSelections).toBeUndefined();
    });
  });

  describe('revertChoiceSelection()', () => {
    const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };

    it('should clear selectedMemberIndex and remove from definition after revert', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      FieldTypeOverrideService.applyChoiceSelection(doc, choiceField, 1, namespaceMap);
      expect(choiceField.selectedMemberIndex).toBe(1);
      expect(doc.definition.choiceSelections).toHaveLength(1);

      FieldTypeOverrideService.revertChoiceSelection(doc, choiceField, namespaceMap);

      expect(choiceField.selectedMemberIndex).toBeUndefined();
      expect(doc.definition.choiceSelections).toHaveLength(0);
    });

    it('should be no-op if field has no selection', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      expect(choiceField.selectedMemberIndex).toBeUndefined();

      expect(() => {
        FieldTypeOverrideService.revertChoiceSelection(doc, choiceField, namespaceMap);
      }).not.toThrow();

      expect(doc.definition.choiceSelections).toBeUndefined();
    });

    it('should be no-op when field is not a choice compositor', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const regularField = new XmlSchemaField(shipOrderField, 'email', false);
      shipOrderField.fields.push(regularField);

      expect(() => {
        FieldTypeOverrideService.revertChoiceSelection(doc, regularField, namespaceMap);
      }).not.toThrow();

      expect(regularField.selectedMemberIndex).toBeUndefined();
      expect(doc.definition.choiceSelections).toBeUndefined();
    });

    it('should invalidate descendant overrides and selections after reverting choice selection', () => {
      const doc = TestUtil.createSourceOrderDoc();
      const shipOrderField = doc.fields[0];
      const choiceField = makeChoiceField(shipOrderField, ['email', 'phone']);
      shipOrderField.fields.push(choiceField);

      FieldTypeOverrideService.applyChoiceSelection(doc, choiceField, 0, namespaceMap);

      doc.definition.fieldTypeOverrides = [
        {
          schemaPath: '/ns0:ShipOrder/{choice:0}/email/emailAddress',
          type: 'xs:int',
          originalType: 'xs:string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];
      doc.definition.choiceSelections!.push({
        schemaPath: '/ns0:ShipOrder/{choice:0}/email/{choice:0}',
        selectedMemberIndex: 0,
      });

      FieldTypeOverrideService.revertChoiceSelection(doc, choiceField, namespaceMap);

      expect(
        doc.definition.fieldTypeOverrides?.some((o) => o.schemaPath === '/ns0:ShipOrder/{choice:0}/email/emailAddress'),
      ).toBe(false);
      expect(
        doc.definition.choiceSelections?.some((s) => s.schemaPath === '/ns0:ShipOrder/{choice:0}/email/{choice:0}'),
      ).toBe(false);
      expect(doc.definition.choiceSelections?.some((s) => s.schemaPath === '/ns0:ShipOrder/{choice:0}')).toBe(false);
    });
  });
});
