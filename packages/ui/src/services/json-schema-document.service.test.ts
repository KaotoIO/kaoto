import { JSONSchema7 } from 'json-schema';

import { PathExpression, Types } from '../models/datamapper';
import { DocumentType } from '../models/datamapper/document';
import { NS_XPATH_FUNCTIONS } from '../models/datamapper/xslt';
import { camelYamlDslJsonSchema } from '../stubs/datamapper/data-mapper';
import { JsonSchemaDocumentService } from './json-schema-document.service';

describe('JsonSchemaDocumentService', () => {
  const namespaces = {
    fn: NS_XPATH_FUNCTIONS,
  };

  it('should parse string', () => {
    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      'test',
      JSON.stringify({ type: 'string' }),
    );

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
    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      'test',
      JSON.stringify({ type: 'number' }),
    );

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
    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
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
    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      'test',
      JSON.stringify(schema),
    );

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
    const camelDoc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      'test',
      camelYamlDslJsonSchema,
    );

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
    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      'intTest',
      JSON.stringify(schema),
    );

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
      JsonSchemaDocumentService.createJsonSchemaDocument(DocumentType.TARGET_BODY, 'test', JSON.stringify(schema));
    }).toThrow(
      'Unsupported schema reference [https://example.com/schema.json]: External URI/file reference is not yet supported',
    );
  });

  it('should throw error for external file reference in $ref', () => {
    const schema: JSONSchema7 = {
      type: 'object',
      properties: {
        fileRef: { $ref: './external-schema.json' },
      },
    };

    expect(() => {
      JsonSchemaDocumentService.createJsonSchemaDocument(DocumentType.TARGET_BODY, 'test', JSON.stringify(schema));
    }).toThrow(
      'Unsupported schema reference [./external-schema.json]: External URI/file reference is not yet supported',
    );
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
      JsonSchemaDocumentService.createJsonSchemaDocument(DocumentType.TARGET_BODY, 'test', JSON.stringify(schema));
    }).toThrow(
      'Unsupported schema reference [http://json-schema.org/draft-07/schema#]: External URI/file reference is not yet supported',
    );
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
      JsonSchemaDocumentService.createJsonSchemaDocument(DocumentType.TARGET_BODY, 'test', JSON.stringify(schema));
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

    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      'test',
      JSON.stringify(schema),
    );

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

    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      'test',
      JSON.stringify(schema),
    );

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

    const doc = JsonSchemaDocumentService.createJsonSchemaDocument(
      DocumentType.SOURCE_BODY,
      'test',
      JSON.stringify(schema),
    );

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
});
