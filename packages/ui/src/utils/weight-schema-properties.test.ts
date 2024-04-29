import { ErrorHandler } from '@kaoto/camel-catalog/types';
import { errorHandlerSchema } from '../stubs/error-handler';
import { weightSchemaProperties } from './weight-schema-properties';

describe('weightSchemaProperties', () => {
  it('should return `0` for non-property `oneOf` definition', () => {
    const model: ErrorHandler = {
      deadLetterChannel: {
        deadLetterHandleNewException: true,
      },
    };

    const result = weightSchemaProperties(model, { type: 'object' }, errorHandlerSchema);

    expect(result).toBe(0);
  });

  it('should return `0` when a model key does not exists in the `oneOf` definition', () => {
    const model: ErrorHandler = {
      deadLetterChannel: {
        deadLetterHandleNewException: true,
      },
    };

    const result = weightSchemaProperties(
      model,
      { type: 'object', properties: { anotherProperty: { type: 'number' } } },
      errorHandlerSchema,
    );

    expect(result).toBe(0);
  });

  it('should return `1` when a model key exists in the `oneOf` definition but it is of a different type', () => {
    const model: ErrorHandler = {
      deadLetterChannel: 23,
    };

    const result = weightSchemaProperties(
      model,
      { type: 'object', properties: { deadLetterChannel: { type: 'string' } } },
      errorHandlerSchema,
    );

    expect(result).toBe(1);
  });

  it('should return `11` when a model key exists in the `oneOf` definition with the same type', () => {
    const model: ErrorHandler = {
      deadLetterChannel: 23,
    };

    const result = weightSchemaProperties(
      model,
      { type: 'object', properties: { deadLetterChannel: { type: 'number' } } },
      errorHandlerSchema,
    );

    expect(result).toBe(11);
  });

  it('should return the weight of the properties recursively', () => {
    const model: ErrorHandler = {
      deadLetterChannel: {
        deadLetterHandleNewException: true,
      },
    };

    const result = weightSchemaProperties(model, errorHandlerSchema.oneOf![0], errorHandlerSchema);

    expect(result).toBe(22);
  });

  it('should resolve nested oneOf properties', () => {
    const model: ErrorHandler = {
      '': undefined,
      noErrorHandler: undefined,
      refErrorHandler: {
        id: 'id',
        ref: 'myReference',
      },
    };

    const result = weightSchemaProperties(model, errorHandlerSchema.oneOf![5], errorHandlerSchema);

    expect(result).toBe(23);
  });
});
