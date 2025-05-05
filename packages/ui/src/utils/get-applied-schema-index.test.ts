import { ErrorHandler } from '@kaoto/camel-catalog/types';
import { errorHandlerSchema } from '../stubs/error-handler';
import { getAppliedSchemaIndex } from './get-applied-schema-index';
import { OneOfSchemas } from './get-oneof-schema-list';

describe('getAppliedSchemaIndex', () => {
  const oneOfSchemas: OneOfSchemas[] = errorHandlerSchema.oneOf!.map((schema) => ({
    name: schema.title!,
    description: schema.description,
    schema,
  }));

  it('should return the index of the applied oneOf schema for a given model', () => {
    const model: ErrorHandler = {
      springTransactionErrorHandler: {
        id: 'springTransactionErrorHandler',
        logName: 'springTransactionErrorHandler',
        useOriginalBody: true,
      },
    };

    const result = getAppliedSchemaIndex(model, oneOfSchemas, errorHandlerSchema);

    expect(result).toBe(6);
  });

  it('should return the index of the applied oneOf schema for a given model when a missing required property', () => {
    const model: ErrorHandler = {
      deadLetterChannel: {
        deadLetterHandleNewException: true,
      },
      springTransactionErrorHandler: undefined,
    };

    const result = getAppliedSchemaIndex(model, oneOfSchemas, errorHandlerSchema);

    expect(result).toBe(0);
  });
});
