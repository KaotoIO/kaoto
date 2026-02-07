import { DocumentDefinition, DocumentDefinitionType, DocumentType, Types } from '../models/datamapper';
import { IFieldTypeOverride } from '../models/datamapper/metadata';
import { TypeOverrideVariant } from '../models/datamapper/types';
import { accountJsonSchema } from '../stubs/datamapper/data-mapper';
import { DocumentUtilService } from './document-util.service';
import { JsonSchemaDocument, JsonSchemaField } from './json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { JsonSchemaTypesService } from './json-schema-types.service';

describe('DocumentUtilService - JSON Schema', () => {
  describe('adoptTypeFragment()', () => {
    it('should adopt type when fragment has type defined', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.AnyType);

      const fragment = {
        type: Types.String,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.type).toBe(Types.String);
    });

    it('should adopt minOccurs when fragment has it defined', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.String);

      const fragment = {
        minOccurs: 5,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.minOccurs).toBe(5);
    });

    it('should adopt maxOccurs when fragment has it defined', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.String);

      const fragment = {
        maxOccurs: 10,
        fields: [],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.maxOccurs).toBe(10);
    });

    it('should adopt all fields from fragment using JSON Schema adopt logic', () => {
      const doc = new JsonSchemaDocument(
        new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'test-doc'),
      );
      const field = new JsonSchemaField(doc, 'testField', Types.Container);

      const fragmentField1 = new JsonSchemaField(doc, 'child1', Types.String);
      const fragmentField2 = new JsonSchemaField(doc, 'child2', Types.Integer);

      const fragment = {
        fields: [fragmentField1, fragmentField2],
        namedTypeFragmentRefs: [],
      };

      DocumentUtilService.adoptTypeFragment(field, fragment);

      expect(field.fields.length).toBe(2);
      expect(field.fields[0].key).toBe('child1');
      expect(field.fields[1].key).toBe('child2');
    });
  });

  describe('resolveTypeFragment()', () => {
    it('should resolve JSON Schema $ref fragment', () => {
      const refSchema = JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        definitions: {
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
            },
          },
        },
        type: 'object',
        properties: {
          home: { $ref: '#/definitions/Address' },
        },
      });

      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'ref', {
        'ref.json': refSchema,
      });
      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;

      const homeField = doc.fields[0].fields.find((f) => 'key' in f && f.key === 'home');
      expect(homeField?.namedTypeFragmentRefs).toHaveLength(1);
      expect(homeField?.fields).toHaveLength(0);

      DocumentUtilService.resolveTypeFragment(homeField!);

      expect(homeField?.namedTypeFragmentRefs).toHaveLength(0);
      expect(homeField?.fields.length).toBe(2);
      const streetField = homeField?.fields.find((f) => 'key' in f && f.key === 'street');
      const cityField = homeField?.fields.find((f) => 'key' in f && f.key === 'city');
      expect(streetField?.type).toBe(Types.String);
      expect(cityField?.type).toBe(Types.String);
    });
  });

  describe('processTypeOverrides()', () => {
    it('should apply type override to top-level JSON field', () => {
      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'account', {
        'account.json': accountJsonSchema,
      });
      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const namespaceMap = { fn: 'http://www.w3.org/2005/xpath-functions' };
      const overrides: IFieldTypeOverride[] = [
        {
          path: '/fn:map/fn:string[@key="AccountId"]',
          type: 'number',
          originalType: 'string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, JsonSchemaTypesService.parseTypeOverride);

      const accountIdField = doc.fields[0].fields.find((f) => 'key' in f && f.key === 'AccountId');
      expect(accountIdField?.type).toBe(Types.Numeric);
      expect(accountIdField?.typeOverride).toBe(TypeOverrideVariant.FORCE);
    });

    it('should apply type override to nested JSON field', () => {
      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'account', {
        'account.json': accountJsonSchema,
      });
      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const namespaceMap = { fn: 'http://www.w3.org/2005/xpath-functions' };
      const overrides: IFieldTypeOverride[] = [
        {
          path: '/fn:map/fn:map[@key="Address"]/fn:string[@key="City"]',
          type: 'number',
          originalType: 'string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, JsonSchemaTypesService.parseTypeOverride);

      const addressField = doc.fields[0].fields.find((f) => 'key' in f && f.key === 'Address');
      const cityField = addressField?.fields.find((f) => 'key' in f && f.key === 'City');
      expect(cityField?.type).toBe(Types.Numeric);
      expect(cityField?.typeOverride).toBe(TypeOverrideVariant.FORCE);
    });

    it('should distinguish between fields with same key at different levels', () => {
      const nestedSchema = JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          foo: { type: 'string' },
          map: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
          },
        },
      });

      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'nested', {
        'nested.json': nestedSchema,
      });
      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const namespaceMap = { fn: 'http://www.w3.org/2005/xpath-functions' };

      const overrides: IFieldTypeOverride[] = [
        {
          path: '/fn:map/fn:map[@key="map"]/fn:string[@key="foo"]',
          type: 'number',
          originalType: 'string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, JsonSchemaTypesService.parseTypeOverride);

      const topLevelFoo = doc.fields[0].fields.find((f) => 'key' in f && f.key === 'foo');
      expect(topLevelFoo?.type).toBe(Types.String);
      expect(topLevelFoo?.typeOverride).toBe(TypeOverrideVariant.NONE);

      const mapField = doc.fields[0].fields.find((f) => 'key' in f && f.key === 'map');
      const nestedFoo = mapField?.fields.find((f) => 'key' in f && f.key === 'foo');
      expect(nestedFoo?.type).toBe(Types.Numeric);
      expect(nestedFoo?.typeOverride).toBe(TypeOverrideVariant.FORCE);
    });

    it('should apply override to /fn:map/fn:string[@key=foo] but not /fn:map[@key=map]/fn:string[@key=foo]', () => {
      const nestedSchema = JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          foo: { type: 'string' },
          map: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
          },
        },
      });

      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.JSON_SCHEMA, 'nested', {
        'nested.json': nestedSchema,
      });
      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');
      const doc = result.document!;
      const namespaceMap = { fn: 'http://www.w3.org/2005/xpath-functions' };

      const overrides: IFieldTypeOverride[] = [
        {
          path: '/fn:map/fn:string[@key="foo"]',
          type: 'boolean',
          originalType: 'string',
          variant: TypeOverrideVariant.FORCE,
        },
      ];

      DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, JsonSchemaTypesService.parseTypeOverride);

      const topLevelFoo = doc.fields[0].fields.find((f) => 'key' in f && f.key === 'foo');
      expect(topLevelFoo?.type).toBe(Types.Boolean);
      expect(topLevelFoo?.typeOverride).toBe(TypeOverrideVariant.FORCE);

      const mapField = doc.fields[0].fields.find((f) => 'key' in f && f.key === 'map');
      const nestedFoo = mapField?.fields.find((f) => 'key' in f && f.key === 'foo');
      expect(nestedFoo?.type).toBe(Types.String);
      expect(nestedFoo?.typeOverride).toBe(TypeOverrideVariant.NONE);
    });
  });
});
