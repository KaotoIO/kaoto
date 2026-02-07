import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper/document';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
import { JsonSchemaDocument, JsonSchemaField } from './json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { JsonSchemaTypesService } from './json-schema-types.service';

describe('JsonSchemaTypesService', () => {
  describe('parseTypeOverride()', () => {
    it('should parse primitive type string', () => {
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
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('string', {}, field);

      expect(parseResult.type).toBe(Types.String);
      expect(parseResult.typeQName.getLocalPart()).toBe('string');
      const namespaceURI = parseResult.typeQName.getNamespaceURI();
      expect(namespaceURI === null || namespaceURI === '').toBe(true);
    });

    it('should parse number type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('number', {}, field);

      expect(parseResult.type).toBe(Types.Numeric);
    });

    it('should parse integer type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('integer', {}, field);

      expect(parseResult.type).toBe(Types.Integer);
    });

    it('should parse boolean type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('boolean', {}, field);

      expect(parseResult.type).toBe(Types.Boolean);
    });

    it('should parse object type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('object', {}, field);

      expect(parseResult.type).toBe(Types.Container);
    });

    it('should parse array type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('array', {}, field);

      expect(parseResult.type).toBe(Types.Array);
    });

    it('should parse $ref as Container type', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': JSON.stringify({
            type: 'object',
            $defs: {
              Address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                },
              },
            },
          }),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('#/$defs/Address', {}, field);

      expect(parseResult.type).toBe(Types.Container);
      expect(parseResult.typeQName.getLocalPart()).toBe('#/$defs/Address');
    });

    it('should determine SAFE variant for AnyType field', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('string', {}, field);

      expect(parseResult.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should determine FORCE variant for non-AnyType field', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.String);

      const parseResult = JsonSchemaTypesService.parseTypeOverride('number', {}, field);

      expect(parseResult.variant).toBe(TypeOverrideVariant.FORCE);
    });
  });

  describe('mapTypeStringToEnum()', () => {
    it('should map "string" to Types.String', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('string')).toBe(Types.String);
    });

    it('should map "number" to Types.Numeric', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('number')).toBe(Types.Numeric);
    });

    it('should map "integer" to Types.Integer', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('integer')).toBe(Types.Integer);
    });

    it('should map "boolean" to Types.Boolean', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('boolean')).toBe(Types.Boolean);
    });

    it('should map "object" to Types.Container', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('object')).toBe(Types.Container);
    });

    it('should map "array" to Types.Array', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('array')).toBe(Types.Array);
    });

    it('should map unknown type to Types.AnyType', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('unknown')).toBe(Types.AnyType);
    });

    it('should be case-insensitive', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('STRING')).toBe(Types.String);
      expect(JsonSchemaTypesService.mapTypeStringToEnum('Number')).toBe(Types.Numeric);
      expect(JsonSchemaTypesService.mapTypeStringToEnum('BOOLEAN')).toBe(Types.Boolean);
    });
  });

  describe('getAllJsonSchemaTypes()', () => {
    it('should return all built-in JSON Schema types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;

      const allTypes = JsonSchemaTypesService.getAllJsonSchemaTypes(doc);

      expect(Object.keys(allTypes).length).toBeGreaterThanOrEqual(6);
      expect(Object.values(allTypes).some((t) => t.displayName === 'string' && t.isBuiltIn)).toBe(true);
      expect(Object.values(allTypes).some((t) => t.displayName === 'number' && t.isBuiltIn)).toBe(true);
      expect(Object.values(allTypes).some((t) => t.displayName === 'integer' && t.isBuiltIn)).toBe(true);
      expect(Object.values(allTypes).some((t) => t.displayName === 'boolean' && t.isBuiltIn)).toBe(true);
      expect(Object.values(allTypes).some((t) => t.displayName === 'object' && t.isBuiltIn)).toBe(true);
      expect(Object.values(allTypes).some((t) => t.displayName === 'array' && t.isBuiltIn)).toBe(true);
    });

    it('should include user-defined types from $defs', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': JSON.stringify({
            type: 'object',
            $defs: {
              Address: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                },
              },
              Person: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                },
              },
            },
          }),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;

      const allTypes = JsonSchemaTypesService.getAllJsonSchemaTypes(doc);

      const userDefinedTypes = Object.values(allTypes).filter((t) => !t.isBuiltIn);
      expect(userDefinedTypes.length).toBeGreaterThanOrEqual(2);
      expect(userDefinedTypes.some((t) => t.displayName.includes('Address'))).toBe(true);
      expect(userDefinedTypes.some((t) => t.displayName.includes('Person'))).toBe(true);
    });

    it('should include user-defined types from definitions', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': JSON.stringify({
            type: 'object',
            definitions: {
              Contact: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                },
              },
            },
          }),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;

      const allTypes = JsonSchemaTypesService.getAllJsonSchemaTypes(doc);

      const userDefinedTypes = Object.values(allTypes).filter((t) => !t.isBuiltIn);
      expect(userDefinedTypes.some((t) => t.displayName.includes('Contact'))).toBe(true);
    });

    it('should mark user-defined types as Container', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': JSON.stringify({
            type: 'object',
            $defs: {
              MyType: { type: 'object' },
            },
          }),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;

      const allTypes = JsonSchemaTypesService.getAllJsonSchemaTypes(doc);

      const userDefinedTypes = Object.values(allTypes).filter((t) => !t.isBuiltIn);
      expect(userDefinedTypes.every((t) => t.type === Types.Container)).toBe(true);
    });

    it('should have null namespaceURI for JSON Schema types', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;

      const allTypes = JsonSchemaTypesService.getAllJsonSchemaTypes(doc);

      expect(Object.values(allTypes).every((t) => t.namespaceURI === null)).toBe(true);
    });
  });

  describe('getTypeOverrideCandidatesForField()', () => {
    it('should return empty record', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': JSON.stringify({ type: 'object' }) },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const doc = result.document as JsonSchemaDocument;
      const field = new JsonSchemaField(doc, 'testField', Types.String);

      const candidates = JsonSchemaTypesService.getTypeOverrideCandidatesForField(field);

      expect(candidates).toEqual({});
    });
  });
});
