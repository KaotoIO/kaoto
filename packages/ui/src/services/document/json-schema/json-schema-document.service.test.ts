import { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import { DocumentDefinition, DocumentDefinitionType, PathExpression, Types } from '../../../models/datamapper';
import { BODY_DOCUMENT_ID, DocumentType } from '../../../models/datamapper/document';
import { IFieldSubstitution } from '../../../models/datamapper/metadata';
import { NS_XPATH_FUNCTIONS } from '../../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant } from '../../../models/datamapper/types';
import {
  getAccountJsonSchema,
  getCamelYamlDslJsonSchema,
  getCommonTypesJsonSchema,
  getCustomerJsonSchema,
  getMainWithRefJsonSchema,
  getOrderJsonSchema,
  getProductJsonSchema,
} from '../../../stubs/datamapper/data-mapper';
import { DocumentUtilService } from '../document-util.service';
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
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
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
    expect(doc.fields).toHaveLength(1);

    const rootField = doc.fields[0];
    expect(rootField.type).toBe(Types.String);
    expect(rootField.name).toBe('string');
    expect(rootField.predicates).toHaveLength(0);
    expect(rootField.maxOccurs).toBe(1);
    expect(rootField.getExpression(namespaces)).toBe('fn:string');
    // default prefix 'fn' is used even if it's not yet in namespace map
    expect(rootField.getExpression({})).toBe('fn:string');
  });

  it('should parse number', () => {
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify({ type: 'number' }));

    expect(doc).toBeDefined();
    expect(doc.fields).toHaveLength(1);

    const rootField = doc.fields[0];
    expect(rootField.type).toBe(Types.Numeric);
    expect(rootField.name).toBe('number');
    expect(rootField.predicates).toHaveLength(0);
    expect(rootField.maxOccurs).toBe(1);
    expect(rootField.getExpression(namespaces)).toBe('fn:number');
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
    expect(doc.fields).toHaveLength(1);

    const rootArrayField = doc.fields[0];
    expect(rootArrayField.type).toBe(Types.Array);
    expect(rootArrayField.name).toBe('array');
    expect(rootArrayField.predicates).toHaveLength(0);
    expect(rootArrayField.maxOccurs).toBe(1);
    expect(rootArrayField.fields).toHaveLength(1);
    expect(rootArrayField.getExpression(namespaces)).toBe('fn:array');

    const arrayItemField = rootArrayField.fields[0];
    expect(arrayItemField.type).toBe(Types.String);
    expect(arrayItemField.name).toBe('string');
    expect(arrayItemField.predicates).toHaveLength(0);
    expect(arrayItemField.maxOccurs).toBe(Number.MAX_SAFE_INTEGER);
    expect(arrayItemField.getExpression(namespaces)).toBe('fn:string');
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
    expect(doc.fields).toHaveLength(1);

    const root = doc.fields[0];
    expect(root.type).toEqual(Types.Container);
    expect(root.name).toBe('map');
    expect(root.predicates).toHaveLength(0);
    expect(root.displayName).toBe('map');
    expect(root.maxOccurs).toBe(1);
    expect(root.fields).toHaveLength(4);
    expect(root.getExpression(namespaces)).toBe('fn:map');

    const strProp = root.fields[0];
    expect(strProp.type).toEqual(Types.String);
    expect(strProp.name).toBe('string');
    expect(strProp.predicates).toHaveLength(1);
    let left = strProp.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toBe('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(strProp.predicates[0].right).toBe('strProp');
    expect(strProp.displayName).toBe('string [@key = strProp]');
    expect(strProp.maxOccurs).toBe(1);
    expect(strProp.fields).toHaveLength(0);
    expect(strProp.getExpression(namespaces)).toBe("fn:string[@key='strProp']");

    const numProp = root.fields[1];
    expect(numProp.type).toEqual(Types.Numeric);
    expect(numProp.name).toBe('number');
    expect(numProp.predicates).toHaveLength(1);
    left = numProp.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toBe('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(numProp.predicates[0].right).toBe('numProp');
    expect(numProp.displayName).toBe('number [@key = numProp]');
    expect(numProp.maxOccurs).toBe(1);
    expect(numProp.fields).toHaveLength(0);
    expect(numProp.getExpression(namespaces)).toBe("fn:number[@key='numProp']");

    const objProp = root.fields[2];
    expect(objProp.type).toEqual(Types.Container);
    expect(objProp.name).toBe('map');
    expect(objProp.predicates).toHaveLength(1);
    left = objProp.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toBe('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(objProp.predicates[0].right).toBe('objProp');
    expect(objProp.displayName).toBe('map [@key = objProp]');
    expect(objProp.maxOccurs).toBe(1);
    expect(objProp.fields).toHaveLength(2);
    expect(objProp.getExpression(namespaces)).toBe("fn:map[@key='objProp']");

    const objOne = objProp.fields[0];
    expect(objOne.type).toEqual(Types.String);
    expect(objOne.name).toBe('string');
    expect(objOne.predicates).toHaveLength(1);
    left = objOne.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toBe('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(objOne.predicates[0].right).toBe('objOne');
    expect(objOne.displayName).toBe('string [@key = objOne]');
    expect(objOne.minOccurs).toBe(1);
    expect(objOne.maxOccurs).toBe(1);
    expect(objOne.fields).toHaveLength(0);
    expect(objOne.getExpression(namespaces)).toBe("fn:string[@key='objOne']");

    const objTwo = objProp.fields[1];
    expect(objTwo.type).toEqual(Types.String);
    expect(objTwo.name).toBe('string');
    expect(objTwo.predicates).toHaveLength(1);
    left = objTwo.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toBe('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(objTwo.predicates[0].right).toBe('objTwo');
    expect(objTwo.displayName).toBe('string [@key = objTwo]');
    expect(objTwo.minOccurs).toBe(0);
    expect(objTwo.maxOccurs).toBe(1);
    expect(objTwo.fields).toHaveLength(0);
    expect(objTwo.getExpression(namespaces)).toBe("fn:string[@key='objTwo']");

    const arrProp = root.fields[3];
    expect(arrProp.type).toEqual(Types.Array);
    expect(arrProp.name).toBe('array');
    expect(arrProp.predicates).toHaveLength(1);
    left = arrProp.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toBe('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(arrProp.predicates[0].right).toBe('arrProp');
    expect(arrProp.displayName).toBe('array [@key = arrProp]');
    expect(arrProp.maxOccurs).toBe(1);
    expect(arrProp.fields).toHaveLength(1);
    expect(arrProp.getExpression(namespaces)).toBe("fn:array[@key='arrProp']");

    const arrItem = arrProp.fields[0];
    expect(arrItem.type).toEqual(Types.Container);
    expect(arrItem.name).toBe('map');
    expect(arrItem.predicates).toHaveLength(0);
    expect(arrItem.displayName).toBe('map');
    expect(arrItem.maxOccurs).toBe(Number.MAX_SAFE_INTEGER);
    expect(arrItem.fields).toHaveLength(2);
    expect(arrItem.getExpression(namespaces)).toBe('fn:map');

    const arrOne = arrItem.fields[0];
    expect(arrOne.type).toEqual(Types.String);
    expect(arrOne.name).toBe('string');
    expect(arrOne.predicates).toHaveLength(1);
    left = arrOne.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toBe('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(arrOne.predicates[0].right).toBe('arrOne');
    expect(arrOne.displayName).toBe('string [@key = arrOne]');
    expect(arrOne.minOccurs).toBe(0);
    expect(arrOne.maxOccurs).toBe(1);
    expect(arrOne.fields).toHaveLength(0);
    expect(arrOne.getExpression(namespaces)).toBe("fn:string[@key='arrOne']");

    const arrTwo = arrItem.fields[1];
    expect(arrTwo.type).toEqual(Types.String);
    expect(arrTwo.name).toBe('string');
    expect(arrTwo.predicates).toHaveLength(1);
    left = arrTwo.predicates[0].left as PathExpression;
    expect(left.pathSegments[0].name).toBe('key');
    expect(left.pathSegments[0].isAttribute).toBeTruthy();
    expect(arrTwo.predicates[0].right).toBe('arrTwo');
    expect(arrTwo.displayName).toBe('string [@key = arrTwo]');
    expect(arrTwo.minOccurs).toBe(1);
    expect(arrTwo.maxOccurs).toBe(1);
    expect(arrTwo.fields).toHaveLength(0);
    expect(arrTwo.getExpression(namespaces)).toBe("fn:string[@key='arrTwo']");
  });

  it('should parse and preserve field description', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'The name of the person' },
        age: { type: 'number', description: 'The age in years' },
      },
    };
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    expect(doc.fields).toHaveLength(1);
    const root = doc.fields[0];
    expect(root.fields).toHaveLength(2);

    const nameField = root.fields.find((f) => f.key === 'name');
    expect(nameField).toBeDefined();
    expect(nameField!.description).toBe('The name of the person');

    const ageField = root.fields.find((f) => f.key === 'age');
    expect(ageField).toBeDefined();
    expect(ageField!.description).toBe('The age in years');
  });

  it('should copy description when adopting a field', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        parent: {
          type: 'object',
          properties: {
            child: { type: 'string', description: 'Child field description' },
          },
        },
      },
    };
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const root = doc.fields[0];
    const parentField = root.fields.find((f) => f.key === 'parent');
    expect(parentField).toBeDefined();

    const childField = parentField!.fields.find((f) => f.key === 'child');
    expect(childField).toBeDefined();
    expect(childField!.description).toBe('Child field description');

    // Test adopt method by adopting into a distinct parent field
    const targetDoc = createTestJsonDocument(
      DocumentType.PARAM,
      'target',
      JSON.stringify({
        type: 'object',
        properties: {
          parent: { type: 'object', properties: {} },
        },
      }),
    );
    const targetRoot = targetDoc.fields[0];
    const targetParent = targetRoot.fields.find((f) => f.key === 'parent')!;
    const adoptedChild = childField!.adopt(targetParent);

    expect(adoptedChild.description).toBe('Child field description');
  });

  it('should update description when adopting a field with description over existing field', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        field1: { type: 'string' },
      },
    };
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const root = doc.fields[0];
    const field1 = root.fields.find((f) => f.key === 'field1');
    expect(field1).toBeDefined();
    expect(field1!.description).toBeUndefined();

    // Create a new field with the same key but with description
    const schemaWithDesc: JSONSchema7 = {
      type: 'object',
      properties: {
        field1: { type: 'string', description: 'Updated description' },
      },
    };
    const doc2 = createTestJsonDocument(DocumentType.PARAM, 'test2', JSON.stringify(schemaWithDesc));
    const root2 = doc2.fields[0];
    const field1WithDesc = root2.fields.find((f) => f.key === 'field1');

    // Adopt the field with description into the original parent
    const adopted = field1WithDesc!.adopt(root);
    expect(adopted.description).toBe('Updated description');
  });

  it('should parse camelYamlDsl', () => {
    const camelDoc = createTestJsonDocument(DocumentType.PARAM, 'test', getCamelYamlDslJsonSchema());

    expect(camelDoc).toBeDefined();
    expect(camelDoc.fields).toHaveLength(1);

    const rootArrayField = camelDoc.fields[0];
    expect(rootArrayField.type).toEqual(Types.Array);
    expect(rootArrayField.name).toBe('array');
    expect(rootArrayField.key).toBe('');
    expect(rootArrayField.getExpression({})).toBe('fn:array');
    expect(rootArrayField.maxOccurs).toBe(1);
    expect(rootArrayField.fields).toHaveLength(1);

    const rootObjectField = rootArrayField.fields[0];
    expect(rootObjectField.type).toEqual(Types.Container);
    expect(rootObjectField.name).toBe('map');
    expect(rootObjectField.key).toBe('');
    expect(rootObjectField.getExpression({})).toBe('fn:map');
    expect(rootObjectField.maxOccurs).toBe(Number.MAX_SAFE_INTEGER);
    expect(rootObjectField.fields.length).toBeGreaterThan(10);

    const beansField = rootObjectField.fields.find((f) => f.key === 'beans');
    expect(beansField).toBeDefined();
    expect(beansField!.type).toEqual(Types.Array);
    expect(beansField!.name).toBe('array');
    expect(beansField!.getExpression({})).toBe("fn:array[@key='beans']");
    expect(beansField!.namedTypeFragmentRefs).toHaveLength(1);

    const beansDef = camelDoc.namedTypeFragments[beansField!.namedTypeFragmentRefs[0]];
    expect(beansDef).toBeDefined();
    expect(beansDef.type).toEqual(Types.Array);
    expect(beansDef.fields).toHaveLength(1);
    const beansArrayField = beansDef.fields[0];
    expect(beansArrayField.type).toEqual(Types.Container);
    expect(beansArrayField.name).toBe('map');
    expect(beansArrayField.getExpression({})).toBe('fn:map');
    expect(beansArrayField.maxOccurs).toBe(Number.MAX_SAFE_INTEGER);
    expect(beansArrayField.namedTypeFragmentRefs).toHaveLength(1);

    const beanEntryDef = camelDoc.namedTypeFragments[beansArrayField.namedTypeFragmentRefs[0]];
    expect(beanEntryDef).toBeDefined();
    expect(beanEntryDef.type).toEqual(Types.Container);
    expect(beanEntryDef.fields.length).toBeGreaterThan(10);

    const setBodyDef = camelDoc.namedTypeFragments['#/items/definitions/org.apache.camel.model.SetBodyDefinition'];
    expect(setBodyDef).toBeDefined();
    expect(setBodyDef.type).toEqual(Types.Container);
    expect(setBodyDef.fields.length).toBeGreaterThan(25);
    expect(setBodyDef.namedTypeFragmentRefs).toHaveLength(1);
    expect(setBodyDef.namedTypeFragmentRefs[0]).toBe(
      '#/items/definitions/org.apache.camel.model.language.ExpressionDefinition',
    );

    const setBodyExpression = setBodyDef.fields.find((f) => f.key === 'expression');
    expect(setBodyExpression).toBeDefined();
    expect(setBodyExpression!.name).toBe('map');
    expect(setBodyExpression!.getExpression({})).toBe("fn:map[@key='expression']");
    expect(setBodyExpression!.namedTypeFragmentRefs).toHaveLength(1);
    expect(setBodyExpression!.namedTypeFragmentRefs[0]).toBe(
      '#/items/definitions/org.apache.camel.model.language.ExpressionDefinition',
    );

    const setBodySimple = setBodyDef.fields.find((f) => f.key === 'simple');
    expect(setBodySimple).toBeDefined();
    expect(setBodySimple!.type).toEqual(Types.AnyType);
    expect(setBodySimple!.name).toBe('map');
    expect(setBodySimple!.getExpression({})).toBe("fn:map[@key='simple']");
    expect(setBodySimple!.namedTypeFragmentRefs).toHaveLength(0);

    const expressionDef =
      camelDoc.namedTypeFragments['#/items/definitions/org.apache.camel.model.language.ExpressionDefinition'];
    expect(expressionDef).toBeDefined();
    expect(expressionDef.type).toEqual(Types.Container);
    expect(expressionDef.fields.length).toBeGreaterThan(25);

    const expressionSimple = expressionDef.fields.find((f) => f.key === 'simple');
    expect(expressionSimple).toBeDefined();
    expect(expressionSimple!.type).toEqual(Types.AnyType);
    expect(expressionSimple!.name).toBe('map');
    expect(expressionSimple!.getExpression({})).toBe("fn:map[@key='simple']");
    expect(expressionSimple!.namedTypeFragmentRefs).toHaveLength(1);
    expect(expressionSimple!.namedTypeFragmentRefs[0]).toBe(
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
    expect(root.fields).toHaveLength(1);

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
    expect(objField!.fields).toHaveLength(2);

    const aField = objField!.fields.find((f) => f.key === 'a');
    const bField = objField!.fields.find((f) => f.key === 'b');
    expect(aField).toBeDefined();
    expect(bField).toBeDefined();
    expect(aField!.type).toBe(Types.String);
    expect(bField!.type).toBe(Types.Numeric);
  });

  it('should use the first entry of a type array as the field type', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        nullableName: { type: ['string', 'null'] },
      },
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const field = doc.fields[0].fields.find((f) => f.key === 'nullableName');
    expect(field!.type).toBe(Types.String);
    expect(field!.typeQName?.getLocalPart()).toBe('string');
  });

  it('should create no item field for an array without items', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        list: { type: 'array' },
      },
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const list = doc.fields[0].fields.find((f) => f.key === 'list');
    expect(list!.type).toBe(Types.Array);
    expect(list!.fields).toHaveLength(0);
  });

  it('should create the item field from tuple-form items', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        tuple: { type: 'array', items: [{ type: 'string' }] },
      },
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const tuple = doc.fields[0].fields.find((f) => f.key === 'tuple');
    expect(tuple!.fields).toHaveLength(1);
    expect(tuple!.fields[0].type).toBe(Types.String);
    expect(tuple!.fields[0].maxOccurs).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should turn a field into an array when a composition declares an array type', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        tags: { allOf: [{ type: 'array', items: { type: 'string' } }] },
      },
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const tags = doc.fields[0].fields.find((f) => f.key === 'tags');
    expect(tags!.type).toBe(Types.Array);
    expect(tags!.fields).toHaveLength(1);
    expect(tags!.fields[0].type).toBe(Types.String);
  });

  it('should ignore boolean and empty composition entries', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        value: { anyOf: [true, {}, { type: 'string' }] },
      },
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const value = doc.fields[0].fields.find((f) => f.key === 'value');
    expect(value!.type).toBe(Types.String);
  });

  it('should not duplicate a boolean property that a composition declares again', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        flag: true,
      },
      allOf: [{ properties: { flag: true } }],
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const root = doc.fields[0];
    expect(root.fields.filter((f) => f.key === 'flag')).toHaveLength(1);
    expect(root.fields[0].type).toBe(Types.AnyType);
  });

  describe('named type fragments from definitions', () => {
    it('should register $defs and definitions under their own paths', () => {
      const schema: JSONSchema7 = {
        type: 'object',
        $defs: { Name: { type: 'string' } },
        definitions: { Count: { type: 'number' } },
        properties: {
          name: { $ref: '#/$defs/Name' },
          count: { $ref: '#/definitions/Count' },
        },
      };

      const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

      expect(Object.keys(doc.namedTypeFragments).sort((a, b) => a.localeCompare(b))).toEqual([
        '#/$defs/Name',
        '#/definitions/Count',
      ]);
      const root = doc.fields[0];
      expect(root.fields.find((f) => f.key === 'name')!.type).toBe(Types.String);
      expect(root.fields.find((f) => f.key === 'count')!.type).toBe(Types.Numeric);
    });

    it.each<[string, JSONSchema7Definition]>([
      ['boolean', true],
      ['empty', {}],
    ])('should not register a %s definition as a type fragment', (_kind, definition) => {
      const schema: JSONSchema7 = {
        type: 'object',
        definitions: { Anything: definition },
      };

      const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

      expect(doc.namedTypeFragments).toEqual({});
    });
  });

  it.each([
    ['an empty definition', {}],
    ['a boolean definition', true],
  ])('should register the definitions that follow %s', (_desc, emptyDefinition) => {
    const schema: JSONSchema7 = {
      type: 'object',
      definitions: {
        Empty: emptyDefinition,
        Real: { type: 'object', properties: { a: { type: 'string' } } },
      },
      properties: {
        x: { $ref: '#/definitions/Real' },
      },
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const xField = doc.fields[0].fields.find((f) => f.key === 'x');
    expect(doc.namedTypeFragments['#/definitions/Real']).toBeDefined();
    expect(xField!.type).toBe(Types.Container);
  });

  it.each([
    ['a boolean schema', true],
    ['an empty schema', {}],
  ])('should not duplicate a typed property redeclared as %s in a composition', (_desc, redeclared) => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        a: { type: 'string' },
      },
      allOf: [{ properties: { a: redeclared } }],
    };

    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const aFields = doc.fields[0].fields.filter((f) => f.key === 'a');
    expect(aFields).toHaveLength(1);
    expect(aFields[0].type).toBe(Types.String);
  });

  it.each(['allOf', 'anyOf', 'oneOf'] as const)(
    'should resolve a $ref to a definition declared inside %s',
    (composition) => {
      const schema: JSONSchema7 = {
        type: 'object',
        [composition]: [{ type: 'object' }, { definitions: { D: { type: 'string' } } }],
        properties: {
          x: { $ref: `#/${composition}/1/definitions/D` },
        },
      };

      const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

      const xField = doc.fields[0].fields.find((f) => f.key === 'x');
      expect(xField!.type).toBe(Types.String);
    },
  );

  it.each([
    [
      'tuple array items',
      { type: 'array', items: [{ type: 'string' }, { type: 'number' }] } as JSONSchema7,
      (doc: JsonSchemaDocument) => doc.fields[0].fields[0],
    ],
    [
      'a property redeclared with another type in a composition',
      {
        type: 'object',
        properties: { foo: { type: 'string' } },
        anyOf: [{ properties: { foo: { type: 'number' } } }],
      } as JSONSchema7,
      (doc: JsonSchemaDocument) => doc.fields[0].fields.find((f) => f.key === 'foo')!,
    ],
  ])('should keep the typeQName of the first declared type for %s', (_desc, schema, getField) => {
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));

    const field = getField(doc);
    expect(field.type).toBe(Types.String);
    expect(field.typeQName?.getLocalPart()).toBe('string');
  });

  it('should keep the required properties of a referenced definition required', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        addr: { $ref: '#/definitions/Address' },
      },
      definitions: {
        Address: {
          type: 'object',
          required: ['street'],
          properties: { street: { type: 'string' }, city: { type: 'string' } },
        },
      },
    };
    const doc = createTestJsonDocument(DocumentType.PARAM, 'test', JSON.stringify(schema));
    const addr = doc.fields[0].fields.find((f) => f.key === 'addr')!;

    DocumentUtilService.resolveTypeFragment(addr);

    expect(addr.fields.find((f) => f.key === 'street')!.minOccurs).toBe(1);
    expect(addr.fields.find((f) => f.key === 'city')!.minOccurs).toBe(0);
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
        throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
      }
      return result.document;
    };

    it('should load multiple schema files', () => {
      const doc = createMultiSchemaDocument(DocumentType.PARAM, 'multiTest1', {
        'Order.schema.json': getOrderJsonSchema(),
        'Customer.schema.json': getCustomerJsonSchema(),
        'CommonTypes.schema.json': getCommonTypesJsonSchema(),
      });

      expect(doc).toBeDefined();
      expect(doc.fields).toHaveLength(1);

      const root = doc.fields[0];
      expect(root.type).toBe(Types.Container);
    });

    it('should resolve relative path external $ref', () => {
      const doc = createMultiSchemaDocument(DocumentType.PARAM, 'multiTest2', {
        'Order.schema.json': getOrderJsonSchema(),
        'Customer.schema.json': getCustomerJsonSchema(),
        'CommonTypes.schema.json': getCommonTypesJsonSchema(),
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
        'Order.schema.json': getOrderJsonSchema(),
        'Customer.schema.json': getCustomerJsonSchema(),
        'CommonTypes.schema.json': getCommonTypesJsonSchema(),
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
        'Order.schema.json': getOrderJsonSchema(),
        'Customer.schema.json': getCustomerJsonSchema(),
        'CommonTypes.schema.json': getCommonTypesJsonSchema(),
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

    it('should create the document for circular references across files', () => {
      const doc = createMultiSchemaDocument(DocumentType.PARAM, 'circular', {
        'A.json': JSON.stringify({ type: 'object', properties: { b: { $ref: './B.json' } } }),
        'B.json': JSON.stringify({ type: 'object', properties: { a: { $ref: './A.json' } } }),
      });

      const bField = doc.fields[0].fields.find((f) => f.key === 'b')!;
      DocumentUtilService.resolveTypeFragment(bField);
      const aField = bField.fields.find((f) => f.key === 'a')!;
      DocumentUtilService.resolveTypeFragment(aField);
      expect(bField.type).toBe(Types.Container);
      expect(aField.type).toBe(Types.Container);
      expect(aField.fields.find((f) => f.key === 'b')).toBeDefined();
    });

    it('should use first schema as document schema', () => {
      const customerFirstDoc = createMultiSchemaDocument(DocumentType.PARAM, 'customerFirst', {
        'Customer.schema.json': getCustomerJsonSchema(),
        'CommonTypes.schema.json': getCommonTypesJsonSchema(),
      });

      const root = customerFirstDoc.fields[0];
      const customerId = root.fields.find((f) => f.key === 'customerId');
      expect(customerId).toBeDefined();
    });

    it('should maintain backward compatibility with single-file schemas', () => {
      const singleFileDoc = createTestJsonDocument(DocumentType.PARAM, 'test', getAccountJsonSchema());

      expect(singleFileDoc.fields[0].type).toBe(Types.Container);
    });

    it('should respect rootElementChoice.name as primary schema', () => {
      const doc = createMultiSchemaDocument(
        DocumentType.PARAM,
        'customer',
        {
          'Order.schema.json': getOrderJsonSchema(),
          'Customer.schema.json': getCustomerJsonSchema(),
          'CommonTypes.schema.json': getCommonTypesJsonSchema(),
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
        'Customer.schema.json': getCustomerJsonSchema(),
        'Order.schema.json': getOrderJsonSchema(),
        'CommonTypes.schema.json': getCommonTypesJsonSchema(),
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
          'Order.schema.json': getOrderJsonSchema(),
        },
        { namespaceUri: '', name: 'NonExistent.schema.json' },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.errors?.map((e) => e.message).join('; ')).toContain('NonExistent.schema.json');
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
          'MainWithRef.schema.json': getMainWithRefJsonSchema(),
          'CommonTypes.schema.json': getCommonTypesJsonSchema(),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);

      expect(result.validationStatus).toBe('success');
      const document = result.document as JsonSchemaDocument;
      expect(document).toBeDefined();

      const root = document.fields[0];
      const addressField = root.fields.find((f) => f.key === 'address');
      expect(addressField).toBeDefined();
      expect(addressField!.namedTypeFragmentRefs).toHaveLength(1);

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
          'nested/Product.schema.json': getProductJsonSchema(),
          'CommonTypes.schema.json': getCommonTypesJsonSchema(),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);

      expect(result.validationStatus).toBe('success');
      const document = result.document as JsonSchemaDocument;
      expect(document).toBeDefined();

      const root = document.fields[0];
      const priceField = root.fields.find((f) => f.key === 'price');
      expect(priceField).toBeDefined();
      expect(priceField!.namedTypeFragmentRefs).toHaveLength(1);

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
          'MainWithRef.schema.json': getMainWithRefJsonSchema(),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      expect(result.validationStatus).toBe('error');
      expect(result.errors?.map((e) => e.message).join('; ')).toContain('CommonTypes.schema.json');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it.each<[string, string]>([
      ['does not exist', 'Missing'],
      ['is a boolean schema', 'Flag'],
    ])('should throw when an external $ref points to a definition that %s', (_case, definitionName) => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'Main.json': JSON.stringify({
            type: 'object',
            properties: { other: { $ref: `./Other.json#/definitions/${definitionName}` } },
          }),
          'Other.json': JSON.stringify({ type: 'object', definitions: { Flag: true } }),
        },
      );

      expect(() => JsonSchemaDocumentService.createJsonSchemaDocument(definition)).toThrow(
        `Cannot resolve definition at Other.json#/definitions/${definitionName}`,
      );
    });

    it('should return a warning status with the analysis warnings when the document can still be created', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'main.json': JSON.stringify({ $id: 'other.json', type: 'object', properties: { s: { type: 'string' } } }),
          'other.json': JSON.stringify({ type: 'string' }),
        },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);

      expect(result.validationStatus).toBe('warning');
      expect(result.document).toBeDefined();
      expect(result.warnings).toEqual([
        {
          message:
            "Schema $id 'other.json' in file 'main.json' conflicts with file path of another schema 'other.json'",
          filePath: 'main.json',
        },
      ]);
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
        'CommonTypes.schema.json': getCommonTypesJsonSchema(),
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
        'CommonTypes.schema.json': getCommonTypesJsonSchema(),
        'Customer.schema.json': getCustomerJsonSchema(),
      });

      const collection = document.schemaCollection;
      expect(collection.getJsonSchema('http://example.com/schemas/common-types.json')).toBeDefined();
      expect(collection.getJsonSchema('http://example.com/schemas/customer.json')).toBeDefined();
    });

    it('should add JSON schemas to the collection', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'test.json': '{"type": "object"}' },
      );

      const result = JsonSchemaDocumentService.createJsonSchemaDocument(definition);
      const document = result.document as JsonSchemaDocument;

      JsonSchemaDocumentService.addSchemaFiles(document, {
        'additional.json': '{"$id": "http://example.com/additional", "type": "object"}',
      });

      expect(document.schemaCollection.getJsonSchema('http://example.com/additional')).toBeDefined();
    });
  });

  describe('removeSchemaFile', () => {
    it('should return error with updated definition when removing a dependency file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'MainWithRef.schema.json': getMainWithRefJsonSchema(),
          'CommonTypes.schema.json': getCommonTypesJsonSchema(),
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
        { 'Account.schema.json': getAccountJsonSchema(), 'camelYamlDsl.json': getCamelYamlDslJsonSchema() },
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
        { 'Account.schema.json': getAccountJsonSchema() },
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
          'MainWithRef.schema.json': getMainWithRefJsonSchema(),
          'CommonTypes.schema.json': getCommonTypesJsonSchema(),
        },
      );

      JsonSchemaDocumentService.removeSchemaFile(definition, 'CommonTypes.schema.json');
      expect(definition.definitionFiles!['CommonTypes.schema.json']).toBeDefined();
    });

    it('should fallback to first schema when rootElementChoice is the removed file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'Account.schema.json': getAccountJsonSchema(), 'camelYamlDsl.json': getCamelYamlDslJsonSchema() },
        { namespaceUri: '', name: 'Account.schema.json' },
      );

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'Account.schema.json');
      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.rootElementChoice).toBeUndefined();
    });

    it('should fallback to first schema when rootElementChoice matches by $id and that file is removed', () => {
      const schemaWithId = JSON.stringify({
        $id: 'urn:account',
        type: 'object',
        properties: { id: { type: 'string' } },
      });
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'Account.schema.json': schemaWithId, 'camelYamlDsl.json': getCamelYamlDslJsonSchema() },
        { namespaceUri: '', name: 'urn:account' },
      );

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'Account.schema.json');
      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.rootElementChoice).toBeUndefined();
    });

    it('should preserve rootElementChoice when it is not the removed file', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'Account.schema.json': getAccountJsonSchema(), 'camelYamlDsl.json': getCamelYamlDslJsonSchema() },
        { namespaceUri: '', name: 'Account.schema.json' },
      );

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'camelYamlDsl.json');
      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.rootElementChoice).toEqual({
        namespaceUri: '',
        name: 'Account.schema.json',
      });
    });

    it('should clear fieldTypeOverrides, choiceSelections and fieldSubstitutions when primary schema is removed', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'Account.schema.json': getAccountJsonSchema(), 'camelYamlDsl.json': getCamelYamlDslJsonSchema() },
        { namespaceUri: '', name: 'Account.schema.json' },
      );
      definition.fieldTypeOverrides = [
        { schemaPath: '/old/path', type: 'xs:int', originalType: 'xs:string', variant: FieldOverrideVariant.FORCE },
      ];
      definition.choiceSelections = [{ schemaPath: '/old/{choice:0}', selectedMemberIndex: 1 }];
      const substitution: IFieldSubstitution = {
        schemaPath: '/old/path',
        name: 'ns0:newName',
        originalName: 'ns0:oldName',
      };
      definition.fieldSubstitutions = [substitution];

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'Account.schema.json');

      expect(removeResult.validationStatus).not.toBe('error');
      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.fieldTypeOverrides).toEqual([]);
      expect(removeResult.documentDefinition!.choiceSelections).toEqual([]);
      expect(removeResult.documentDefinition!.fieldSubstitutions).toEqual([]);
    });

    it('should clear overrides when no rootElementChoice and the implicit primary schema shifts', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'Account.schema.json': getAccountJsonSchema(), 'camelYamlDsl.json': getCamelYamlDslJsonSchema() },
      );
      definition.fieldTypeOverrides = [
        { schemaPath: '/old/path', type: 'xs:int', originalType: 'xs:string', variant: FieldOverrideVariant.FORCE },
      ];
      definition.choiceSelections = [{ schemaPath: '/old/{choice:0}', selectedMemberIndex: 1 }];
      definition.fieldSubstitutions = [{ schemaPath: '/old/path', name: 'ns0:newName', originalName: 'ns0:oldName' }];

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'Account.schema.json');

      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.fieldTypeOverrides).toEqual([]);
      expect(removeResult.documentDefinition!.choiceSelections).toEqual([]);
      expect(removeResult.documentDefinition!.fieldSubstitutions).toEqual([]);
    });

    it('should preserve overrides when explicit rootElementChoice is set and a non-primary dependency is removed', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'MainWithRef.schema.json': getMainWithRefJsonSchema(),
          'CommonTypes.schema.json': getCommonTypesJsonSchema(),
        },
        { namespaceUri: '', name: 'MainWithRef.schema.json' },
      );
      definition.fieldTypeOverrides = [
        { schemaPath: '/old/path', type: 'xs:int', originalType: 'xs:string', variant: FieldOverrideVariant.FORCE },
      ];
      definition.choiceSelections = [{ schemaPath: '/old/{choice:0}', selectedMemberIndex: 1 }];
      definition.fieldSubstitutions = [{ schemaPath: '/old/path', name: 'ns0:newName', originalName: 'ns0:oldName' }];

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'CommonTypes.schema.json');

      expect(removeResult.documentDefinition!.rootElementChoice).toEqual({
        namespaceUri: '',
        name: 'MainWithRef.schema.json',
      });
      expect(removeResult.documentDefinition!.fieldTypeOverrides).toHaveLength(1);
      expect(removeResult.documentDefinition!.choiceSelections).toHaveLength(1);
      expect(removeResult.documentDefinition!.fieldSubstitutions).toHaveLength(1);
    });

    it('should return error and preserve rootElementChoice when dependency removal breaks the primary schema', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        {
          'MainWithRef.schema.json': getMainWithRefJsonSchema(),
          'CommonTypes.schema.json': getCommonTypesJsonSchema(),
        },
        { namespaceUri: '', name: 'MainWithRef.schema.json' },
      );

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'CommonTypes.schema.json');

      expect(removeResult.validationStatus).toBe('error');
      expect(removeResult.documentDefinition!.rootElementChoice).toEqual({
        namespaceUri: '',
        name: 'MainWithRef.schema.json',
      });
    });

    it('should preserve overrides when no rootElementChoice and the implicit primary schema does not shift', () => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        'test-doc',
        { 'Account.schema.json': getAccountJsonSchema(), 'camelYamlDsl.json': getCamelYamlDslJsonSchema() },
      );
      definition.fieldTypeOverrides = [
        { schemaPath: '/old/path', type: 'xs:int', originalType: 'xs:string', variant: FieldOverrideVariant.FORCE },
      ];
      definition.choiceSelections = [{ schemaPath: '/old/{choice:0}', selectedMemberIndex: 1 }];
      definition.fieldSubstitutions = [{ schemaPath: '/old/path', name: 'ns0:newName', originalName: 'ns0:oldName' }];

      const removeResult = JsonSchemaDocumentService.removeSchemaFile(definition, 'camelYamlDsl.json');

      expect(removeResult.document).toBeDefined();
      expect(removeResult.documentDefinition!.fieldTypeOverrides).toHaveLength(1);
      expect(removeResult.documentDefinition!.choiceSelections).toHaveLength(1);
      expect(removeResult.documentDefinition!.fieldSubstitutions).toHaveLength(1);
    });
  });
});
