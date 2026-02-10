import { JSONSchema7 } from 'json-schema';

import { DocumentDefinition, DocumentDefinitionType, PathExpression, Types } from '../models/datamapper';
import { BODY_DOCUMENT_ID, DocumentType } from '../models/datamapper/document';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/standard-namespaces';
import {
  accountJsonSchema,
  camelYamlDslJsonSchema,
  commonTypesJsonSchema,
  customerJsonSchema,
  mainWithRefJsonSchema,
  orderJsonSchema,
  productJsonSchema,
} from '../stubs/datamapper/data-mapper';
import { DocumentUtilService } from './document-util.service';
import { JsonSchemaDocument } from './json-schema-document.model';
import { JsonSchemaDocumentService } from './json-schema-document.service';

function createTestJsonDocument(documentType: DocumentType, documentId: string, content: string): JsonSchemaDocument {
  const definition = new DocumentDefinition(
    documentType,
    DocumentDefinitionType.JSON_SCHEMA,
    documentType === DocumentType.PARAM ? documentId : BODY_DOCUMENT_ID,
    { [`${documentId}.json`]: content },
  );
  const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
  if (result.validationStatus === 'error' || !result.document) {
    throw new Error(result.errors?.join('; ') || 'Failed to create document');
  }
  return result.document;
}

describe('JsonSchemaDocumentService', () => {
  const namespaces = {
    fn: NS_XPATH_FUNCTIONS,
  };

  it('should parse string', () => {
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify({ type: 'string' }));

    expect(doc).toBeDefined();
    expect(doc.fields.length).toBe(1);

    const rootField = doc.fields[0];
    expect(rootField.type).toBe(Types.String);
    expect(rootField.name).toBe('string');
    expect(rootField.predicates.length).toBe(0);
    expect(rootField.maxOccurs).toEqual(1);
    expect(rootField.getExpression(namespaces)).toEqual('fn:string');
    // default prefix 'fn' is used even if it's not yet in namespace map
    expect(rootField.getExpression({})).toEqual('fn:string');
  });

  it('should parse number', () => {
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify({ type: 'number' }));

    expect(doc).toBeDefined();
    expect(doc.fields.length).toBe(1);

    const rootField = doc.fields[0];
    expect(rootField.type).toBe(Types.Numeric);
    expect(rootField.name).toBe('number');
    expect(rootField.predicates.length).toBe(0);
    expect(rootField.maxOccurs).toEqual(1);
    expect(rootField.getExpression(namespaces)).toEqual('fn:number');
  });

  it('should parse topmost string array', () => {
    const doc = createTestJsonDocument(
      DocumentType.PARAM,
      'test',
      JSON.stringify({
        type: 'array',
        items: { type: 'string' },
      }),
    );

    expect(doc).toBeDefined();
    expect(doc.fields.length).toBe(1);

    const rootArrayField = doc.fields[0];
    expect(rootArrayField.type).toBe(Types.Array);
    expect(rootArrayField.name).toBe('array');
    expect(rootArrayField.predicates.length).toBe(0);
    expect(rootArrayField.maxOccurs).toEqual(1);
    expect(rootArrayField.fields.length).toEqual(1);
    expect(rootArrayField.getExpression(namespaces)).toEqual('fn:array');

    const arrayItemField = rootArrayField.fields[0];
    expect(arrayItemField.type).toBe(Types.String);
    expect(arrayItemField.name).toBe('string');
    expect(arrayItemField.predicates.length).toBe(0);
    expect(arrayItemField.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
    expect(arrayItemField.getExpression(namespaces)).toEqual('fn:string');
  });

  it('should parse object', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        strProp: { type: 'string' },
        numProp: { type: 'number' },
        objProp: {
          type: 'object',
          properties: {
            objOne: { type: 'string' },
            objTwo: { type: 'string' },
          },
          required: ['objOne'],
        },
        arrProp: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              arrOne: { type: 'string' },
              arrTwo: { type: 'string' },
            },
            required: ['arrTwo'],
          },
        },
      },
    };
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    expect(doc).toBeDefined();
    expect(doc.fields.length).toBe(1);

    const root = doc.fields[0];
    expect(root.type).toEqual(Types.Container);
    expect(root.name).toBe('map');
    expect(root.predicates.length).toBe(0);
    expect(root.displayName).toEqual('map');
    expect(root.maxOccurs).toEqual(1);
    expect(root.fields.length).toBe(4);
    expect(root.getExpression(namespaces)).toEqual('fn:map');

    const strProp = root.fields[0];
    expect(strProp.type).toEqual(Types.String);
    expect(strProp.name).toBe('string');
    expect(strProp.predicates.length).toBe(1);
    let left = strProp.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toEqual('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(strProp.predicates[0].right).toEqual('strProp');
    expect(strProp.displayName).toEqual('string [@key = strProp]');
    expect(strProp.maxOccurs).toEqual(1);
    expect(strProp.fields.length).toBe(0);
    expect(strProp.getExpression(namespaces)).toEqual("fn:string[@key='strProp']");

    const numProp = root.fields[1];
    expect(numProp.type).toEqual(Types.Numeric);
    expect(numProp.name).toEqual('number');
    expect(numProp.predicates.length).toBe(1);
    left = numProp.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toEqual('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(numProp.predicates[0].right).toEqual('numProp');
    expect(numProp.displayName).toEqual('number [@key = numProp]');
    expect(numProp.maxOccurs).toEqual(1);
    expect(numProp.fields.length).toBe(0);
    expect(numProp.getExpression(namespaces)).toEqual("fn:number[@key='numProp']");

    const objProp = root.fields[2];
    expect(objProp.type).toEqual(Types.Container);
    expect(objProp.name).toEqual('map');
    expect(objProp.predicates.length).toBe(1);
    left = objProp.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toEqual('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(objProp.predicates[0].right).toEqual('objProp');
    expect(objProp.displayName).toEqual('map [@key = objProp]');
    expect(objProp.maxOccurs).toEqual(1);
    expect(objProp.fields.length).toBe(2);
    expect(objProp.getExpression(namespaces)).toEqual("fn:map[@key='objProp']");

    const objOne = objProp.fields[0];
    expect(objOne.type).toEqual(Types.String);
    expect(objOne.name).toBe('string');
    expect(objOne.predicates.length).toBe(1);
    left = objOne.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toEqual('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(objOne.predicates[0].right).toEqual('objOne');
    expect(objOne.displayName).toEqual('string [@key = objOne]');
    expect(objOne.minOccurs).toEqual(1);
    expect(objOne.maxOccurs).toEqual(1);
    expect(objOne.fields.length).toBe(0);
    expect(objOne.getExpression(namespaces)).toEqual("fn:string[@key='objOne']");

    const objTwo = objProp.fields[1];
    expect(objTwo.type).toEqual(Types.String);
    expect(objTwo.name).toBe('string');
    expect(objTwo.predicates.length).toBe(1);
    left = objTwo.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toEqual('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(objTwo.predicates[0].right).toEqual('objTwo');
    expect(objTwo.displayName).toEqual('string [@key = objTwo]');
    expect(objTwo.minOccurs).toEqual(0);
    expect(objTwo.maxOccurs).toEqual(1);
    expect(objTwo.fields.length).toBe(0);
    expect(objTwo.getExpression(namespaces)).toEqual("fn:string[@key='objTwo']");

    const arrProp = root.fields[3];
    expect(arrProp.type).toEqual(Types.Array);
    expect(arrProp.name).toBe('array');
    expect(arrProp.predicates.length).toBe(1);
    left = arrProp.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toEqual('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(arrProp.predicates[0].right).toEqual('arrProp');
    expect(arrProp.displayName).toEqual('array [@key = arrProp]');
    expect(arrProp.maxOccurs).toEqual(1);
    expect(arrProp.fields.length).toBe(1);
    expect(arrProp.getExpression(namespaces)).toEqual("fn:array[@key='arrProp']");

    const arrItem = arrProp.fields[0];
    expect(arrItem.type).toEqual(Types.Container);
    expect(arrItem.name).toBe('map');
    expect(arrItem.predicates.length).toBe(0);
    expect(arrItem.displayName).toEqual('map');
    expect(arrItem.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
    expect(arrItem.fields.length).toBe(2);
    expect(arrItem.getExpression(namespaces)).toEqual('fn:map');

    const arrOne = arrItem.fields[0];
    expect(arrOne.type).toEqual(Types.String);
    expect(arrOne.name).toBe('string');
    expect(arrOne.predicates.length).toBe(1);
    left = arrOne.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toEqual('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(arrOne.predicates[0].right).toEqual('arrOne');
    expect(arrOne.displayName).toEqual('string [@key = arrOne]');
    expect(arrOne.minOccurs).toEqual(0);
    expect(arrOne.maxOccurs).toEqual(1);
    expect(arrOne.fields.length).toBe(0);
    expect(arrOne.getExpression(namespaces)).toEqual("fn:string[@key='arrOne']");

    const arrTwo = arrItem.fields[1];
    expect(arrTwo.type).toEqual(Types.String);
    expect(arrTwo.name).toBe('string');
    expect(arrTwo.predicates.length).toBe(1);
    left = arrTwo.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toEqual('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(arrTwo.predicates[0].right).toEqual('arrTwo');
    expect(arrTwo.displayName).toEqual('string [@key = arrTwo]');
    expect(arrTwo.minOccurs).toEqual(1);
    expect(arrTwo.maxOccurs).toEqual(1);
    expect(arrTwo.fields.length).toBe(0);
    expect(arrTwo.getExpression(namespaces)).toEqual("fn:string[@key='arrTwo']");
  });

  it('should parse camelYamlDsl', () => {
    const camelDoc = createTestJsonDocument(DocumentType.PARAM, 'test', camelYamlDslJsonSchema);

    expect(camelDoc).toBeDefined();
    expect(camelDoc.fields.length).toBe(1);

    const rootArrayField = camelDoc.fields[0];
    expect(rootArrayField.type).toEqual(Types.Array);
    expect(rootArrayField.name).toEqual('array');
    expect(rootArrayField.key).toEqual('');
    expect(rootArrayField.getExpression({})).toEqual('fn:array');
    expect(rootArrayField.maxOccurs).toEqual(1);
    expect(rootArrayField.fields.length).toEqual(1);

    const rootObjectField = rootArrayField.fields[0];
    expect(rootObjectField.type).toEqual(Types.Container);
    expect(rootObjectField.name).toEqual('map');
    expect(rootObjectField.key).toEqual('');
    expect(rootObjectField.getExpression({})).toEqual('fn:map');
    expect(rootObjectField.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
    expect(rootObjectField.fields.length).toBeGreaterThan(10);

    const beansField = rootObjectField.fields.find((f) => f.key === 'beans');
    expect(beansField).toBeDefined();
    expect(beansField!.type).toEqual(Types.Array);
    expect(beansField!.name).toEqual('array');
    expect(beansField!.getExpression({})).toEqual("fn:array[@key='beans']");
    expect(beansField!.namedTypeFragmentRefs.length).toBe(1);

    const beansDef = camelDoc.namedTypeFragments[beansField!.namedTypeFragmentRefs[0]];
    expect(beansDef).toBeDefined();
    expect(beansDef.type).toEqual(Types.Array);
    expect(beansDef.fields.length).toBe(1);
    const beansArrayField = beansDef.fields[0];
    expect(beansArrayField.type).toEqual(Types.Container);
    expect(beansArrayField.name).toEqual('map');
    expect(beansArrayField.getExpression({})).toEqual('fn:map');
    expect(beansArrayField.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
    expect(beansArrayField.namedTypeFragmentRefs.length).toBe(1);

    const beanEntryDef = camelDoc.namedTypeFragments[beansArrayField.namedTypeFragmentRefs[0]];
    expect(beanEntryDef).toBeDefined();
    expect(beanEntryDef.type).toEqual(Types.Container);
    expect(beanEntryDef.fields.length).toBeGreaterThan(10);

    const setBodyDef = camelDoc.namedTypeFragments['#/items/definitions/org.apache.camel.model.SetBodyDefinition'];
    expect(setBodyDef).toBeDefined();
    expect(setBodyDef.type).toEqual(Types.Container);
    expect(setBodyDef.fields.length).toBeGreaterThan(25);
    expect(setBodyDef.namedTypeFragmentRefs.length).toBe(1);
    expect(setBodyDef.namedTypeFragmentRefs[0]).toEqual(
      '#/items/definitions/org.apache.camel.model.language.ExpressionDefinition',
    );

    const setBodyExpression = setBodyDef.fields.find((f) => f.key === 'expression');
    expect(setBodyExpression).toBeDefined();
    expect(setBodyExpression!.name).toEqual('map');
    expect(setBodyExpression!.getExpression({})).toEqual("fn:map[@key='expression']");
    expect(setBodyExpression!.namedTypeFragmentRefs.length).toBe(1);
    expect(setBodyExpression!.namedTypeFragmentRefs[0]).toEqual(
      '#/items/definitions/org.apache.camel.model.language.ExpressionDefinition',
    );

    const setBodySimple = setBodyDef.fields.find((f) => f.key === 'simple');
    expect(setBodySimple).toBeDefined();
    expect(setBodySimple!.type).toEqual(Types.AnyType);
    expect(setBodySimple!.name).toEqual('map');
    expect(setBodySimple!.getExpression({})).toEqual("fn:map[@key='simple']");
    expect(setBodySimple!.namedTypeFragmentRefs.length).toBe(0);

    const expressionDef =
      camelDoc.namedTypeFragments['#/items/definitions/org.apache.camel.model.language.ExpressionDefinition'];
    expect(expressionDef).toBeDefined();
    expect(expressionDef.type).toEqual(Types.Container);
    expect(expressionDef.fields.length).toBeGreaterThan(25);

    const expressionSimple = expressionDef.fields.find((f) => f.key === 'simple');
    expect(expressionSimple).toBeDefined();
    expect(expressionSimple!.type).toEqual(Types.AnyType);
    expect(expressionSimple!.name).toEqual('map');
    expect(expressionSimple!.getExpression({})).toEqual("fn:map[@key='simple']");
    expect(expressionSimple!.namedTypeFragmentRefs.length).toBe(1);
    expect(expressionSimple!.namedTypeFragmentRefs[0]).toEqual(
      '#/items/definitions/org.apache.camel.model.language.SimpleExpression',
    );
  });

  it('should parse integer distinctly from number', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        Quantity: { type: 'integer' },
        Price: { type: 'number' },
      },
    };
    const doc = createTestJsonDocument(DocumentType.PARAM, 'intTest', JSON.stringify(schema));

    const root = doc.fields[0];
    const qty = root.fields.find((f) => f.key === 'Quantity');
    const price = root.fields.find((f) => f.key === 'Price');
    expect(qty).toBeDefined();
    expect(price).toBeDefined();
    expect(qty!.type).toBe(Types.Integer);
    expect(qty!.name).toBe('number');
    expect(price!.type).toBe(Types.Numeric);
    expect(price!.name).toBe('number');
  });

  it('should throw error for external URI reference in $ref', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        externalRef: { $ref: 'https://example.com/schema.json' },
      },
    };

    expect(() => {
      createTestJsonDocument(DocumentType.TARGET_BODY, 'test', JSON.stringify(schema));
    }).toThrow('https://example.com/schema.json');
  });

  it('should throw error for external file reference in $ref', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        fileRef: { $ref: './external-schema.json' },
      },
    };

    expect(() => {
      createTestJsonDocument(DocumentType.TARGET_BODY, 'test', JSON.stringify(schema));
    }).toThrow('external-schema.json');
  });

  it('should throw error for external reference in nested schema definition', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { $ref: 'http://json-schema.org/draft-07/schema#' },
        },
      },
    };

    expect(() => {
      createTestJsonDocument(DocumentType.TARGET_BODY, 'test', JSON.stringify(schema));
    }).toThrow('json-schema.org/draft-07/schema');
  });

  it('should allow internal references starting with #', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        internalRef: { $ref: '#/definitions/MyType' },
      },
      definitions: {
        MyType: { type: 'string' },
      },
    };

    expect(() => {
      createTestJsonDocument(DocumentType.TARGET_BODY, 'test', JSON.stringify(schema));
    }).not.toThrow();
  });

  it('should handle anyOf with conflicting types - first concrete type wins', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
      },
      anyOf: [
        {
          properties: {
            foo: { type: 'number' },
          },
        },
      ],
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const root = doc.fields[0];
    expect(root.fields.length).toBe(1);

    const fooField = root.fields.find((f) => f.key === 'foo');
    expect(fooField).toBeDefined();
    expect(fooField!.type).toBe(Types.String);
  });

  it('should refine AnyType to concrete type via composition', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        bar: {},
      },
      anyOf: [
        {
          properties: {
            bar: { type: 'string' },
          },
        },
      ],
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const root = doc.fields[0];
    const barField = root.fields.find((f) => f.key === 'bar');
    expect(barField).toBeDefined();
    expect(barField!.type).toBe(Types.String);
  });

  it('should merge child fields from allOf composition', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        obj: {
          type: 'object',
          properties: {
            a: { type: 'string' },
          },
        },
      },
      allOf: [
        {
          properties: {
            obj: {
              properties: {
                b: { type: 'number' },
              },
            },
          },
        },
      ],
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const root = doc.fields[0];
    const objField = root.fields.find((f) => f.key === 'obj');
    expect(objField).toBeDefined();
    expect(objField!.fields.length).toBe(2);

    const aField = objField!.fields.find((f) => f.key === 'a');
    const bField = objField!.fields.find((f) => f.key === 'b');
    expect(aField).toBeDefined();
    expect(bField).toBeDefined();
    expect(aField!.type).toBe(Types.String);
    expect(bField!.type).toBe(Types.Numeric);
  });

  describe('Cross-schema reference resolution', () => {
    const createMultiSchemaDocument = (
      documentType: DocumentType,
      documentId: string,
      schemas: Record<string, string>,
      rootElementChoice?: { namespaceUri: string; name: string },
    ): JsonSchemaDocument => {
      const definition = new DocumentDefinition(
        documentType,
        DocumentDefinitionType.JSON_SCHEMA,
        documentId,
        schemas,
        rootElementChoice,
      );
      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      if (result.validationStatus === 'error' || !result.document) {
        throw new Error(result.errors?.join('; ') || 'Failed to create document');
      }
      return result.document;
    };

    it('should load multiple schema files', () => {
      const doc = createMultiSchemaDocument(DocumentType.PARAM, 'multiTest1', {
        'Order.schema.json': orderJsonSchema,
        'Customer.schema.json': customerJsonSchema,
        'CommonTypes.schema.json': commonTypesJsonSchema,
      });

      expect(doc).toBeDefined();
      expect(doc.fields.length).toBe(1);

      const root = doc.fields[0];
      expect(root.type).toBe(Types.Container);
    });

    it('should resolve relative path external $ref', () => {
      const doc = createMultiSchemaDocument(DocumentType.PARAM, 'multiTest2', {
        'Order.schema.json': orderJsonSchema,
        'Customer.schema.json': customerJsonSchema,
        'CommonTypes.schema.json': commonTypesJsonSchema,
      });

      const root = doc.fields[0];
      const customer = root.fields.find((f) => f.key === 'customer');
      DocumentUtilService.resolveTypeFragment(customer!);
      const billingAddress = customer!.fields.find((f) => f.key === 'billingAddress');

      expect(billingAddress).toBeDefined();
      expect(billingAddress!.type).toBe(Types.Container);
      DocumentUtilService.resolveTypeFragment(billingAddress!);

      const street = billingAddress!.fields.find((f) => f.key === 'street');
      expect(street).toBeDefined();
      expect(street!.type).toBe(Types.String);
    });

    it('should resolve $id-based URI external $ref', () => {
      const doc = createMultiSchemaDocument(DocumentType.PARAM, 'multiTest3', {
        'Order.schema.json': orderJsonSchema,
        'Customer.schema.json': customerJsonSchema,
        'CommonTypes.schema.json': commonTypesJsonSchema,
      });

      const root = doc.fields[0];
      const customer = root.fields.find((f) => f.key === 'customer');
      DocumentUtilService.resolveTypeFragment(customer!);
      const contact = customer!.fields.find((f) => f.key === 'contact');

      expect(contact).toBeDefined();
      DocumentUtilService.resolveTypeFragment(contact!);
      const email = contact!.fields.find((f) => f.key === 'email');
      expect(email).toBeDefined();
    });

    it('should handle nested cross-file references', () => {
      const doc = createMultiSchemaDocument(DocumentType.PARAM, 'multiTest4', {
        'Order.schema.json': orderJsonSchema,
        'Customer.schema.json': customerJsonSchema,
        'CommonTypes.schema.json': commonTypesJsonSchema,
      });

      const root = doc.fields[0];
      const items = root.fields.find((f) => f.key === 'items');
      DocumentUtilService.resolveTypeFragment(items!);
      const itemElement = items!.fields[0];
      DocumentUtilService.resolveTypeFragment(itemElement);
      const price = itemElement.fields.find((f) => f.key === 'price');
      DocumentUtilService.resolveTypeFragment(price!);
      const amount = price!.fields.find((f) => f.key === 'amount');

      expect(amount).toBeDefined();
      expect(amount!.type).toBe(Types.Numeric);
    });

    it('should use first schema as document schema', () => {
      const customerFirstDoc = createMultiSchemaDocument(DocumentType.PARAM, 'customerFirst', {
        'Customer.schema.json': customerJsonSchema,
        'CommonTypes.schema.json': commonTypesJsonSchema,
      });

      const root = customerFirstDoc.fields[0];
      const customerId = root.fields.find((f) => f.key === 'customerId');
      expect(customerId).toBeDefined();
    });

    it('should maintain backward compatibility with single-file schemas', () => {
      const singleFileDoc = createTestJsonDocument(DocumentType.PARAM, 'test', accountJsonSchema);

      expect(singleFileDoc.fields[0].type).toBe(Types.Container);
    });

    it('should respect rootElementChoice.name as primary schema', () => {
      const doc = createMultiSchemaDocument(
        DocumentType.PARAM,
        'customer',
        {
          'Order.schema.json': orderJsonSchema,
          'Customer.schema.json': customerJsonSchema,
          'CommonTypes.schema.json': commonTypesJsonSchema,
        },
        { namespaceUri: '', name: 'Customer.schema.json' },
      );

      const root = doc.fields[0];
      const customerId = root.fields.find((f) => f.key === 'customerId');
      expect(customerId).toBeDefined();

      const orderId = root.fields.find((f) => f.key === 'orderId');
      expect(orderId).toBeUndefined();
    });

    it('should default to first file when rootElementChoice not specified', () => {
      const doc = createMultiSchemaDocument(DocumentType.PARAM, 'customer', {
        'Customer.schema.json': customerJsonSchema,
        'Order.schema.json': orderJsonSchema,
        'CommonTypes.schema.json': commonTypesJsonSchema,
      });

      const root = doc.fields[0];
      const customerId = root.fields.find((f) => f.key === 'customerId');
      expect(customerId).toBeDefined();
    });

    it('should return error when rootElementChoice.name not found', () => {
      const definition = new DocumentDefinition(
        DocumentType.PARAM,
        DocumentDefinitionType.JSON_SCHEMA,
        'order',
        {
          'Order.schema.json': orderJsonSchema,
        },
        { namespaceUri: '', name: 'NonExistent.schema.json' },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.errors?.join('; ')).toContain('NonExistent.schema.json');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('$ref resolution', () => {
    it('should resolve external $ref with relative path', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'MainWithRef.schema.json': mainWithRefJsonSchema,
          'CommonTypes.schema.json': commonTypesJsonSchema,
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);

      expect(result.validationStatus).toBe('success');
      const document = result.document as JsonSchemaDocument;
      expect(document).toBeDefined();

      const root = document.fields[0];
      const addressField = root.fields.find((f) => f.key === 'address');
      expect(addressField).toBeDefined();
      expect(addressField!.namedTypeFragmentRefs.length).toBe(1);

      const addressTypeRef = addressField!.namedTypeFragmentRefs[0];
      const addressType = document.namedTypeFragments[addressTypeRef];
      expect(addressType).toBeDefined();
      expect(addressType.fields.length).toBeGreaterThan(0);
      expect(addressType.fields.find((f) => f.key === 'street')).toBeDefined();
    });

    it('should resolve $ref with parent directory reference (../)', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'nested/Product.schema.json': productJsonSchema,
          'CommonTypes.schema.json': commonTypesJsonSchema,
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);

      expect(result.validationStatus).toBe('success');
      const document = result.document as JsonSchemaDocument;
      expect(document).toBeDefined();

      const root = document.fields[0];
      const priceField = root.fields.find((f) => f.key === 'price');
      expect(priceField).toBeDefined();
      expect(priceField!.namedTypeFragmentRefs.length).toBe(1);

      const moneyTypeRef = priceField!.namedTypeFragmentRefs[0];
      const moneyType = document.namedTypeFragments[moneyTypeRef];
      expect(moneyType).toBeDefined();
      expect(moneyType.fields.find((f) => f.key === 'amount')).toBeDefined();
      expect(moneyType.fields.find((f) => f.key === 'currency')).toBeDefined();
    });

    it('should return error when referenced schema is missing', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'MainWithRef.schema.json': mainWithRefJsonSchema,
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.errors?.join('; ')).toContain('CommonTypes.schema.json');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('addSchemaFiles', () => {
    it('should add schema files to existing document', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': '{"type": "object", "properties": {"name": {"type": "string"}}}',
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('success');

      const document = result.document as JsonSchemaDocument;
      expect(document).toBeDefined();

      JsonSchemaDocumentService.addSchemaFiles(document, {
        'CommonTypes.schema.json': commonTypesJsonSchema,
      });

      const collection = document.schemaCollection;
      const commonSchema = collection.getJsonSchema('http://example.com/schemas/common-types.json');
      expect(commonSchema).toBeDefined();

      const alsoCommonSchema = collection.getJsonSchema('CommonTypes.schema.json');
      expect(alsoCommonSchema).toBe(commonSchema);
    });

    it('should throw error on invalid JSON in addSchemaFiles', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': '{"type": "object"}',
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const document = result.document!;

      expect(() => {
        JsonSchemaDocumentService.addSchemaFiles(document, {
          'invalid.json': 'not valid json',
        });
      }).toThrow('Failed to add schema file "invalid.json"');
    });

    it('should handle multiple schema files in addSchemaFiles', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'test.json': '{"type": "object"}',
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const document = result.document!;

      JsonSchemaDocumentService.addSchemaFiles(document, {
        'CommonTypes.schema.json': commonTypesJsonSchema,
        'Customer.schema.json': customerJsonSchema,
      });

      const collection = document.schemaCollection;
      expect(collection.getJsonSchema('http://example.com/schemas/common-types.json')).toBeDefined();
      expect(collection.getJsonSchema('http://example.com/schemas/customer.json')).toBeDefined();
    });

    it('should return empty namespace map when adding JSON schemas', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': '{"type": "object"}' },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const document = result.document as JsonSchemaDocument;

      const updatedNamespaceMap = JsonSchemaDocumentService.addSchemaFiles(document, {
        'additional.json': '{"type": "object", "properties": {"field": {"type": "string"}}}',
      });

      expect(updatedNamespaceMap).toEqual({});
    });
  });

  describe('removeSchemaFile', () => {
    it('should return error with updated definition when removing a dependency file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'MainWithRef.schema.json': mainWithRefJsonSchema,
          'CommonTypes.schema.json': commonTypesJsonSchema,
        },
      );
      const initialResult = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(initialResult.validationStatus).toBe('success');

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'CommonTypes.schema.json');
      expect(removeResult.validationStatus).toBe('error');
      expect(removeResult.errors).toBeDefined();
      expect(removeResult.errors!.length).toBeGreaterThan(0);
      expect(removeResult.documentDefinition).toBeDefined();
      expect(removeResult.documentDefinition!.definitionFiles!['CommonTypes.schema.json']).toBeUndefined();
      expect(removeResult.documentDefinition!.definitionFiles!['MainWithRef.schema.json']).toBeDefined();
    });

    it('should succeed when removing a non-essential schema file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'Account.schema.json': accountJsonSchema, 'camelYamlDsl.json': camelYamlDslJsonSchema },
      );

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'camelYamlDsl.json');
      expect(removeResult.validationStatus).toBe('success');
      expect(removeResult.document).toBeDefined();
    });

    it('should return error when removing all schema files', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'Account.schema.json': accountJsonSchema },
      );

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'Account.schema.json');
      expect(removeResult.validationStatus).toBe('error');
      expect(removeResult.errors).toBeDefined();
    });

    it('should not mutate the original definition', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'MainWithRef.schema.json': mainWithRefJsonSchema,
          'CommonTypes.schema.json': commonTypesJsonSchema,
        },
      );

      JsonSchemaDocumentService.removeSchemaFile(definition, 'CommonTypes.schema.json');
      expect(definition.definitionFiles!['CommonTypes.schema.json']).toBeDefined();
    });
  });
});
