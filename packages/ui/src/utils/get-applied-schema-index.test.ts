import { ErrorHandler } from '@kaoto-next/camel-catalog/types';
import { getAppliedSchemaIndex } from './get-applied-schema-index';
import { errorHandlerSchema } from '../stubs/error-handler';

describe('getAppliedSchemaIndex', () => {
  it('should return the index of the applied oneOf schema for a given model', () => {
    const model: ErrorHandler = {
      springTransactionErrorHandler: {
        id: 'springTransactionErrorHandler',
        logName: 'springTransactionErrorHandler',
        useOriginalBody: true,
      },
    };

    const result = getAppliedSchemaIndex(model, errorHandlerSchema.oneOf!, errorHandlerSchema);

    expect(result).toBe(6);
  });

  it('should return the index of the applied oneOf schema for a given model when a missing required property', () => {
    const model: ErrorHandler = {
      deadLetterChannel: {
        deadLetterHandleNewException: true,
      },
      springTransactionErrorHandler: undefined,
    };

    const result = getAppliedSchemaIndex(model, errorHandlerSchema.oneOf!, errorHandlerSchema);

    expect(result).toBe(0);
  });
});
