import { SetHeader } from '@kaoto/camel-catalog/types';
import { KaotoSchemaDefinition } from '../models';
import { expressionDefinitions, setHeaderDefinitions, setHeaderSchema } from '../stubs/expression-definition-schema';
import { weightSchemaAgainstModel } from './weight-schemas-against-model';

describe('weightSchemaAgainstModel', () => {
  it('should weight `0` for an empty model', () => {
    const model = {};
    const schema: KaotoSchemaDefinition['schema'] = { type: 'object' };
    const definition = {};

    const result = weightSchemaAgainstModel(model, schema, definition);

    expect(result).toEqual(10);
  });

  it('should be able to weight a string only schema', () => {
    const model = '${body}';
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string' };

    const result = weightSchemaAgainstModel(model, schema, {});

    expect(result).toEqual(10);
  });

  it('should return `140` when a model key exists in the `oneOf` definition but it is of a different type', () => {
    const model: SetHeader = {
      id: 'setHeader-1234',
      name: 'myHeader',
      expression: {
        constant: 'myValue',
      },
    };
    const schema = { ...setHeaderSchema };
    const definitions = { ...setHeaderDefinitions, ...expressionDefinitions };

    const result = weightSchemaAgainstModel(model, schema, definitions);

    expect(result).toEqual(140);
  });

  it.each([
    [0, setHeaderDefinitions!['org.apache.camel.model.SetHeaderDefinition'].anyOf![0].oneOf![0], 0],
    [1, setHeaderDefinitions!['org.apache.camel.model.SetHeaderDefinition'].anyOf![0].oneOf![1], 0],
    [2, setHeaderDefinitions!['org.apache.camel.model.SetHeaderDefinition'].anyOf![0].oneOf![2], 13],
  ])('should weight different expression schemas - case: [%i]', (_index, schema, expectedPoints) => {
    const model: SetHeader = {
      id: 'setHeader-1234',
      name: 'myHeader',
      expression: {
        constant: 'myValue',
      },
    };
    const definitions = { ...setHeaderDefinitions, ...expressionDefinitions };

    const points = weightSchemaAgainstModel(model, schema, definitions);

    expect(points).toEqual(expectedPoints);
  });

  it('should give weight to object schemas against empty model', () => {
    const stringSchema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
    };

    const objectSchema: KaotoSchemaDefinition['schema'] = {
      type: 'object',
      additionalProperties: false,
      properties: {
        expression: {
          type: 'string',
          title: 'Expression',
          description: 'The expression value in your chosen language syntax',
        },
        id: {
          type: 'string',
          title: 'Id',
          description: 'Sets the id of this node',
        },
        resultType: {
          type: 'string',
          title: 'Result Type',
          description: 'Sets the class of the result type (type from output)',
        },
        trim: {
          type: 'boolean',
          title: 'Trim',
          description: 'Whether to trim the value to remove leading and trailing whitespaces and line breaks',
        },
      },
    };

    const stringResult = weightSchemaAgainstModel({}, stringSchema, {});
    const objectResult = weightSchemaAgainstModel({}, objectSchema, {});

    expect(stringResult).toEqual(0);
    expect(objectResult).toEqual(10);
  });
});
