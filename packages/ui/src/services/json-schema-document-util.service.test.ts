import { DocumentType } from '../models/datamapper';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/xslt';
import { QName } from '../xml-schema-ts/QName';
import { JsonSchemaDocument, JsonSchemaField } from './json-schema-document-model.service';
import { JsonSchemaDocumentUtilService } from './json-schema-document-util.service';

describe('JsonSchemaDocumentUtilService', () => {
  describe('getChildField()', () => {
    it('should find child field by key', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const parent = new JsonSchemaField(doc, 'parent', Types.Container);
      const child1 = new JsonSchemaField(doc, 'child1', Types.String);
      const child2 = new JsonSchemaField(doc, 'child2', Types.Integer);
      parent.fields.push(child1, child2);

      const result = JsonSchemaDocumentUtilService.getChildField(parent, Types.String, 'child1', NS_XPATH_FUNCTIONS);

      expect(result).toBeDefined();
      expect((result as JsonSchemaField).key).toBe('child1');
    });

    it('should return undefined when key does not match', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const parent = new JsonSchemaField(doc, 'parent', Types.Container);
      const child1 = new JsonSchemaField(doc, 'child1', Types.String);
      parent.fields.push(child1);

      const result = JsonSchemaDocumentUtilService.getChildField(
        parent,
        Types.String,
        'nonexistent',
        NS_XPATH_FUNCTIONS,
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when type does not match', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const parent = new JsonSchemaField(doc, 'parent', Types.Container);
      const child1 = new JsonSchemaField(doc, 'child1', Types.String);
      parent.fields.push(child1);

      const result = JsonSchemaDocumentUtilService.getChildField(parent, Types.Integer, 'child1', NS_XPATH_FUNCTIONS);

      expect(result).toBeUndefined();
    });
  });

  describe('toXsltTypeName()', () => {
    it('should return "string" for String type', () => {
      expect(JsonSchemaDocumentUtilService.toXsltTypeName(Types.String)).toBe('string');
    });

    it('should return "number" for Integer type', () => {
      expect(JsonSchemaDocumentUtilService.toXsltTypeName(Types.Integer)).toBe('number');
    });

    it('should return "number" for Numeric type', () => {
      expect(JsonSchemaDocumentUtilService.toXsltTypeName(Types.Numeric)).toBe('number');
    });

    it('should return "boolean" for Boolean type', () => {
      expect(JsonSchemaDocumentUtilService.toXsltTypeName(Types.Boolean)).toBe('boolean');
    });

    it('should return "array" for Array type', () => {
      expect(JsonSchemaDocumentUtilService.toXsltTypeName(Types.Array)).toBe('array');
    });

    it('should return "map" for Container type', () => {
      expect(JsonSchemaDocumentUtilService.toXsltTypeName(Types.Container)).toBe('map');
    });

    it('should return "map" for AnyType (default)', () => {
      expect(JsonSchemaDocumentUtilService.toXsltTypeName(Types.AnyType)).toBe('map');
    });
  });

  describe('parseTypeOverride()', () => {
    it('should parse primitive type override', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaDocumentUtilService.parseTypeOverride('string', {}, field);

      expect(result.type).toBe(Types.String);
      expect(result.typeQName).toEqual(new QName(null, 'string'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse number type override', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaDocumentUtilService.parseTypeOverride('number', {}, field);

      expect(result.type).toBe(Types.Numeric);
      expect(result.typeQName).toEqual(new QName(null, 'number'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse boolean type override', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaDocumentUtilService.parseTypeOverride('boolean', {}, field);

      expect(result.type).toBe(Types.Boolean);
      expect(result.typeQName).toEqual(new QName(null, 'boolean'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse array type override', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaDocumentUtilService.parseTypeOverride('array', {}, field);

      expect(result.type).toBe(Types.Array);
      expect(result.typeQName).toEqual(new QName(null, 'array'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse object type override', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaDocumentUtilService.parseTypeOverride('object', {}, field);

      expect(result.type).toBe(Types.Container);
      expect(result.typeQName).toEqual(new QName(null, 'object'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse type reference with #/ prefix as Container', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaDocumentUtilService.parseTypeOverride('#/definitions/MyType', {}, field);

      expect(result.type).toBe(Types.Container);
      expect(result.typeQName).toEqual(new QName(null, '#/definitions/MyType'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should return FORCE variant when overriding non-AnyType field', () => {
      const doc = new JsonSchemaDocument(DocumentType.SOURCE_BODY, 'test-doc');
      const field = new JsonSchemaField(doc, 'testField', Types.String);

      const result = JsonSchemaDocumentUtilService.parseTypeOverride('number', {}, field);

      expect(result.type).toBe(Types.Numeric);
      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });
  });

  describe('mapTypeStringToEnum()', () => {
    it('should map "string" to String type', () => {
      expect(JsonSchemaDocumentUtilService.mapTypeStringToEnum('string')).toBe(Types.String);
    });

    it('should map "number" to Numeric type', () => {
      expect(JsonSchemaDocumentUtilService.mapTypeStringToEnum('number')).toBe(Types.Numeric);
    });

    it('should map "integer" to Integer type', () => {
      expect(JsonSchemaDocumentUtilService.mapTypeStringToEnum('integer')).toBe(Types.Integer);
    });

    it('should map "boolean" to Boolean type', () => {
      expect(JsonSchemaDocumentUtilService.mapTypeStringToEnum('boolean')).toBe(Types.Boolean);
    });

    it('should map "array" to Array type', () => {
      expect(JsonSchemaDocumentUtilService.mapTypeStringToEnum('array')).toBe(Types.Array);
    });

    it('should map "object" to Container type', () => {
      expect(JsonSchemaDocumentUtilService.mapTypeStringToEnum('object')).toBe(Types.Container);
    });

    it('should fallback to AnyType for unknown type string', () => {
      expect(JsonSchemaDocumentUtilService.mapTypeStringToEnum('unknown')).toBe(Types.AnyType);
    });
  });
});
