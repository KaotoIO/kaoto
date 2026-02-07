import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/standard-namespaces';
import { TypeOverrideVariant, Types } from '../models/datamapper/types';
import { QName } from '../xml-schema-ts/QName';
import {
  JsonSchemaCollection,
  JsonSchemaDocument,
  JsonSchemaField,
  JsonSchemaMetadata,
} from './json-schema-document.model';
import { JsonSchemaDocumentUtilService } from './json-schema-document-util.service';
import { JsonSchemaTypesService } from './json-schema-types.service';

describe('JsonSchemaDocumentUtilService', () => {
  describe('getChildField()', () => {
    it('should find child field by key', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const parent = new JsonSchemaField(doc, 'parent', Types.Container);
      const child1 = new JsonSchemaField(doc, 'child1', Types.String);
      const child2 = new JsonSchemaField(doc, 'child2', Types.Integer);
      parent.fields.push(child1, child2);

      const result = JsonSchemaDocumentUtilService.getChildField(parent, Types.String, 'child1', NS_XPATH_FUNCTIONS);

      expect(result).toBeDefined();
      expect((result as JsonSchemaField).key).toBe('child1');
    });

    it('should return undefined when key does not match', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
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
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
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
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaTypesService.parseTypeOverride('string', {}, field);

      expect(result.type).toBe(Types.String);
      expect(result.typeQName).toEqual(new QName(null, 'string'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse number type override', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaTypesService.parseTypeOverride('number', {}, field);

      expect(result.type).toBe(Types.Numeric);
      expect(result.typeQName).toEqual(new QName(null, 'number'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse boolean type override', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaTypesService.parseTypeOverride('boolean', {}, field);

      expect(result.type).toBe(Types.Boolean);
      expect(result.typeQName).toEqual(new QName(null, 'boolean'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse array type override', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaTypesService.parseTypeOverride('array', {}, field);

      expect(result.type).toBe(Types.Array);
      expect(result.typeQName).toEqual(new QName(null, 'array'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse object type override', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaTypesService.parseTypeOverride('object', {}, field);

      expect(result.type).toBe(Types.Container);
      expect(result.typeQName).toEqual(new QName(null, 'object'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should parse type reference with #/ prefix as Container', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const result = JsonSchemaTypesService.parseTypeOverride('#/definitions/MyType', {}, field);

      expect(result.type).toBe(Types.Container);
      expect(result.typeQName).toEqual(new QName(null, '#/definitions/MyType'));
      expect(result.variant).toBe(TypeOverrideVariant.SAFE);
    });

    it('should return FORCE variant when overriding non-AnyType field', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.String);

      const result = JsonSchemaTypesService.parseTypeOverride('number', {}, field);

      expect(result.type).toBe(Types.Numeric);
      expect(result.variant).toBe(TypeOverrideVariant.FORCE);
    });
  });

  describe('mapTypeStringToEnum()', () => {
    it('should map "string" to String type', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('string')).toBe(Types.String);
    });

    it('should map "number" to Numeric type', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('number')).toBe(Types.Numeric);
    });

    it('should map "integer" to Integer type', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('integer')).toBe(Types.Integer);
    });

    it('should map "boolean" to Boolean type', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('boolean')).toBe(Types.Boolean);
    });

    it('should map "array" to Array type', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('array')).toBe(Types.Array);
    });

    it('should map "object" to Container type', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('object')).toBe(Types.Container);
    });

    it('should fallback to AnyType for unknown type string', () => {
      expect(JsonSchemaTypesService.mapTypeStringToEnum('unknown')).toBe(Types.AnyType);
    });
  });

  describe('createJsonSchemaReference()', () => {
    it('should create reference for internal $ref', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
        definitions: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
            },
          },
        },
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);

      const result = JsonSchemaDocumentUtilService.createJsonSchemaReference(
        '#/definitions/Address',
        schema,
        collection,
      );

      expect(result).not.toBeNull();
      expect(result!.getLocalPart()).toBe('/definitions/Address');
      expect(result!.isExternal()).toBe(false);
      expect(result!.getSchema().identifier).toBe('test-schema');
    });

    it('should create reference for external $ref by identifier', () => {
      const schema1: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema1-id',
        filePath: 'schema1.json',
        path: '#',
      };

      const schema2: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema2-id',
        filePath: 'schema2.json',
        path: '#',
        definitions: {
          Contact: {
            type: 'object',
            properties: {
              email: { type: 'string' },
            },
          },
        },
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema1);
      collection.addJsonSchema(schema2);

      const result = JsonSchemaDocumentUtilService.createJsonSchemaReference(
        'schema2-id#/definitions/Contact',
        schema1,
        collection,
      );

      expect(result).not.toBeNull();
      expect(result!.isExternal()).toBe(true);
      expect(result!.getSchema().identifier).toBe('schema2-id');
      expect(result!.getLocalPart()).toBe('/definitions/Contact');
    });

    it('should create reference for external $ref by filename', () => {
      const schema1: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema1-id',
        filePath: 'schema1.json',
        path: '#',
      };

      const schema2: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema2-id',
        filePath: 'schema2.json',
        path: '#',
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema1);
      collection.addJsonSchema(schema2);

      const result = JsonSchemaDocumentUtilService.createJsonSchemaReference(
        './schema2.json#/definitions/Type',
        schema1,
        collection,
      );

      expect(result).not.toBeNull();
      expect(result!.isExternal()).toBe(true);
      expect(result!.getSchema().identifier).toBe('schema2-id');
    });

    it('should throw error for non-existent external schema', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);

      expect(() => {
        JsonSchemaDocumentUtilService.createJsonSchemaReference('./missing.json#/definitions/Type', schema, collection);
      }).toThrow(/Cannot resolve external schema reference/);
    });

    it('should return null for empty ref', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);

      const result = JsonSchemaDocumentUtilService.createJsonSchemaReference('', schema, collection);

      expect(result).toBeNull();
    });

    it('should handle ref without fragment', () => {
      const schema1: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema1-id',
        filePath: 'schema1.json',
        path: '#',
      };

      const schema2: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema2-id',
        filePath: 'schema2.json',
        path: '#',
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema1);
      collection.addJsonSchema(schema2);

      const result = JsonSchemaDocumentUtilService.createJsonSchemaReference('schema2-id', schema1, collection);

      expect(result).not.toBeNull();
      expect(result!.getLocalPart()).toBe('');
      expect(result!.getSchema().identifier).toBe('schema2-id');
    });
  });

  describe('resolveJsonSchemaReference()', () => {
    it('should resolve reference to definition', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
        definitions: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
        },
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);

      const ref = JsonSchemaDocumentUtilService.createJsonSchemaReference('#/definitions/Address', schema, collection);
      const definition = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref!);

      expect(definition).toBeDefined();
      expect(definition).toEqual(schema.definitions!.Address);
    });

    it('should resolve reference to nested property', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
        definitions: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
            },
          },
        },
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);

      const ref = JsonSchemaDocumentUtilService.createJsonSchemaReference(
        '#/definitions/Address/properties/street',
        schema,
        collection,
      );
      const definition = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref!);

      expect(definition).toBeDefined();
      expect(definition).toEqual({ type: 'string' });
    });

    it('should return schema for root reference', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
        properties: {
          name: { type: 'string' },
        },
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);

      const ref = JsonSchemaDocumentUtilService.createJsonSchemaReference('#', schema, collection);
      const definition = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref!);

      expect(definition).toBeDefined();
      expect(definition).toEqual(schema);
    });

    it('should return schema for empty path reference', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
      };

      const schema2: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema2-id',
        filePath: 'schema2.json',
        path: '#',
        properties: {
          value: { type: 'number' },
        },
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);
      collection.addJsonSchema(schema2);

      const ref = JsonSchemaDocumentUtilService.createJsonSchemaReference('schema2-id', schema, collection);
      const definition = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref!);

      expect(definition).toBeDefined();
      expect(definition).toEqual(schema2);
    });

    it('should return undefined for non-existent path', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
        definitions: {},
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);

      const ref = JsonSchemaDocumentUtilService.createJsonSchemaReference('#/definitions/Missing', schema, collection);
      const definition = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref!);

      expect(definition).toBeUndefined();
    });

    it('should handle path with special JSON pointer characters', () => {
      const schema: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'test-schema',
        filePath: 'test.json',
        path: '#',
        definitions: {
          'foo~bar': {
            type: 'string',
          },
          'baz/qux': {
            type: 'number',
          },
        },
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema);

      const ref1 = JsonSchemaDocumentUtilService.createJsonSchemaReference(
        '#/definitions/foo~0bar',
        schema,
        collection,
      );
      const definition1 = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref1!);

      expect(definition1).toBeDefined();
      expect(definition1).toEqual({ type: 'string' });

      const ref2 = JsonSchemaDocumentUtilService.createJsonSchemaReference(
        '#/definitions/baz~1qux',
        schema,
        collection,
      );
      const definition2 = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref2!);

      expect(definition2).toBeDefined();
      expect(definition2).toEqual({ type: 'number' });
    });

    it('should resolve external reference', () => {
      const schema1: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema1-id',
        filePath: 'schema1.json',
        path: '#',
      };

      const schema2: JsonSchemaMetadata = {
        type: 'object',
        identifier: 'schema2-id',
        filePath: 'schema2.json',
        path: '#',
        definitions: {
          Contact: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              phone: { type: 'string' },
            },
          },
        },
      };

      const collection = new JsonSchemaCollection();
      collection.addJsonSchema(schema1);
      collection.addJsonSchema(schema2);

      const ref = JsonSchemaDocumentUtilService.createJsonSchemaReference(
        'schema2-id#/definitions/Contact',
        schema1,
        collection,
      );
      const definition = JsonSchemaDocumentUtilService.resolveJsonSchemaReference(ref!);

      expect(definition).toBeDefined();
      expect(definition).toEqual(schema2.definitions!.Contact);
    });
  });
});
