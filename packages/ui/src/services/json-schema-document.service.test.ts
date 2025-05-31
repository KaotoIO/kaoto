import { camelYamlDslJsonSchema } from '../stubs/datamapper/data-mapper';
import { JsonSchemaDocumentService } from './json-schema-document.service';
import { DocumentType } from '../models/datamapper/path';
import { Types } from '../models/datamapper';
import { JSONSchema7 } from 'json-schema';

describe('JsonSchemaDocumentService', () => {
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
    expect(rootField.name).toBe('');
    expect(rootField.maxOccurs).toEqual(1);
    expect(rootField.expression).toEqual('xf:string');
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
    expect(rootField.name).toBe('');
    expect(rootField.maxOccurs).toEqual(1);
    expect(rootField.expression).toEqual('xf:number');
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
    expect(rootArrayField.name).toBe('');
    expect(rootArrayField.maxOccurs).toEqual(1);
    expect(rootArrayField.fields.length).toEqual(1);
    expect(rootArrayField.expression).toEqual('xf:array');

    const arrayItemField = rootArrayField.fields[0];
    expect(arrayItemField.type).toBe(Types.String);
    expect(arrayItemField.name).toBe('');
    expect(arrayItemField.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
    expect(arrayItemField.expression).toEqual('xf:string');
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
    expect(root.name).toBe('');
    expect(root.maxOccurs).toEqual(1);
    expect(root.fields.length).toBe(4);
    expect(root.expression).toEqual('xf:map');

    const strProp = root.fields[0];
    expect(strProp.type).toEqual(Types.String);
    expect(strProp.name).toBe('strProp');
    expect(strProp.maxOccurs).toEqual(1);
    expect(strProp.fields.length).toBe(0);
    expect(strProp.expression).toEqual("xf:string[@key='strProp']");

    const numProp = root.fields[1];
    expect(numProp.type).toEqual(Types.Numeric);
    expect(numProp.name).toBe('numProp');
    expect(numProp.maxOccurs).toEqual(1);
    expect(numProp.fields.length).toBe(0);
    expect(numProp.expression).toEqual("xf:number[@key='numProp']");

    const objProp = root.fields[2];
    expect(objProp.type).toEqual(Types.Container);
    expect(objProp.name).toBe('objProp');
    expect(objProp.maxOccurs).toEqual(1);
    expect(objProp.fields.length).toBe(2);
    expect(objProp.expression).toEqual("xf:map[@key='objProp']");

    const objOne = objProp.fields[0];
    expect(objOne.type).toEqual(Types.String);
    expect(objOne.name).toBe('objOne');
    expect(objOne.minOccurs).toEqual(1);
    expect(objOne.maxOccurs).toEqual(1);
    expect(objOne.fields.length).toBe(0);
    expect(objOne.expression).toEqual("xf:string[@key='objOne']");

    const objTwo = objProp.fields[1];
    expect(objTwo.type).toEqual(Types.String);
    expect(objTwo.name).toBe('objTwo');
    expect(objTwo.minOccurs).toEqual(0);
    expect(objTwo.maxOccurs).toEqual(1);
    expect(objTwo.fields.length).toBe(0);
    expect(objTwo.expression).toEqual("xf:string[@key='objTwo']");

    const arrProp = root.fields[3];
    expect(arrProp.type).toEqual(Types.Array);
    expect(arrProp.name).toBe('arrProp');
    expect(arrProp.maxOccurs).toEqual(1);
    expect(arrProp.fields.length).toBe(1);
    expect(arrProp.expression).toEqual("xf:array[@key='arrProp']");

    const arrItem = arrProp.fields[0];
    expect(arrItem.type).toEqual(Types.Container);
    expect(arrItem.name).toBe('');
    expect(arrItem.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
    expect(arrItem.fields.length).toBe(2);
    expect(arrItem.expression).toEqual('xf:map');

    const arrOne = arrItem.fields[0];
    expect(arrOne.type).toEqual(Types.String);
    expect(arrOne.name).toBe('arrOne');
    expect(arrOne.minOccurs).toEqual(0);
    expect(arrOne.maxOccurs).toEqual(1);
    expect(arrOne.fields.length).toBe(0);
    expect(arrOne.expression).toEqual("xf:string[@key='arrOne']");

    const arrTwo = arrItem.fields[1];
    expect(arrTwo.type).toEqual(Types.String);
    expect(arrTwo.name).toBe('arrTwo');
    expect(arrTwo.minOccurs).toEqual(1);
    expect(arrTwo.maxOccurs).toEqual(1);
    expect(arrTwo.fields.length).toBe(0);
    expect(arrTwo.expression).toEqual("xf:string[@key='arrTwo']");
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
    expect(rootArrayField.name).toEqual('');
    expect(rootArrayField.maxOccurs).toEqual(1);
    expect(rootArrayField.fields.length).toEqual(1);

    const rootObjectField = rootArrayField.fields[0];
    expect(rootObjectField.type).toEqual(Types.Container);
    expect(rootObjectField.name).toEqual('');
    expect(rootObjectField.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
    expect(rootObjectField.fields.length).toBeGreaterThan(10);

    const beansField = rootObjectField.fields.find((f) => f.name === 'beans');
    expect(beansField).toBeDefined();
    expect(beansField!.type).toEqual(Types.AnyType);
    expect(beansField!.namedTypeFragmentRefs.length).toBe(1);

    const beansDef = camelDoc.namedTypeFragments[beansField!.namedTypeFragmentRefs[0]];
    expect(beansDef).toBeDefined();
    expect(beansDef.type).toEqual(Types.Array);
    expect(beansDef.maxOccurs).toBe(1);
    expect(beansDef.fields.length).toBe(1);
    const beansArrayField = beansDef.fields[0];
    expect(beansArrayField.type).toEqual(Types.AnyType);
    expect(beansArrayField.name).toEqual('');
    expect(beansArrayField.maxOccurs).toEqual(Number.MAX_SAFE_INTEGER);
    expect(beansArrayField.namedTypeFragmentRefs.length).toBe(1);

    const beanEntryDef = camelDoc.namedTypeFragments[beansArrayField.namedTypeFragmentRefs[0]];
    expect(beanEntryDef).toBeDefined();
    expect(beanEntryDef.type).toEqual(Types.Container);
    expect(beanEntryDef.maxOccurs).toEqual(1);
    expect(beanEntryDef.fields.length).toBeGreaterThan(10);

    const setBodyDef = camelDoc.namedTypeFragments['#/items/definitions/org.apache.camel.model.SetBodyDefinition'];
    expect(setBodyDef).toBeDefined();
    expect(setBodyDef.type).toEqual(Types.Container);
    expect(setBodyDef.minOccurs).toEqual(0);
    expect(setBodyDef.maxOccurs).toEqual(1);
    expect(setBodyDef.fields.length).toBeGreaterThan(25);
    expect(setBodyDef.namedTypeFragmentRefs.length).toBe(1);
    expect(setBodyDef.namedTypeFragmentRefs[0]).toEqual(
      '#/items/definitions/org.apache.camel.model.language.ExpressionDefinition',
    );

    const setBodyExpression = setBodyDef.fields.find((f) => f.name === 'expression');
    expect(setBodyExpression).toBeDefined();
    expect(setBodyExpression!.name).toEqual('expression');
    expect(setBodyExpression!.namedTypeFragmentRefs.length).toBe(1);
    expect(setBodyExpression!.namedTypeFragmentRefs[0]).toEqual(
      '#/items/definitions/org.apache.camel.model.language.ExpressionDefinition',
    );

    const setBodySimple = setBodyDef.fields.find((f) => f.name === 'simple');
    expect(setBodySimple).toBeDefined();
    expect(setBodySimple!.type).toEqual(Types.AnyType);
    expect(setBodySimple!.name).toEqual('simple');
    expect(setBodySimple!.namedTypeFragmentRefs.length).toBe(0);

    const expressionDef =
      camelDoc.namedTypeFragments['#/items/definitions/org.apache.camel.model.language.ExpressionDefinition'];
    expect(expressionDef).toBeDefined();
    expect(expressionDef.type).toEqual(Types.Container);
    expect(expressionDef.minOccurs).toEqual(0);
    expect(expressionDef.maxOccurs).toEqual(1);
    expect(expressionDef.fields.length).toBeGreaterThan(25);

    const expressionSimple = expressionDef.fields.find((f) => f.name === 'simple');
    expect(expressionSimple).toBeDefined();
    expect(expressionSimple!.type).toEqual(Types.AnyType);
    expect(expressionSimple!.name).toEqual('simple');
    expect(expressionSimple!.namedTypeFragmentRefs.length).toBe(1);
    expect(expressionSimple!.namedTypeFragmentRefs[0]).toEqual(
      '#/items/definitions/org.apache.camel.model.language.SimpleExpression',
    );
  });
});
