import { KaotoSchemaDefinition } from '../models';
import { getValidator } from './get-validator';

describe('getValidator', () => {
  const schema: JSONSchema4 = {
    type: 'object',
    properties: {
      name: { type: 'string' },
    },
    required: ['name'],
  };

  it('should return a validator function when schema is valid', () => {
    const validator = getValidator(schema);
    expect(validator).toBeInstanceOf(Function);
  });

  it('should validate a correct model successfully', () => {
    const validator = getValidator(schema);
    const model = { name: 'Test Name' };
    const isValid = validator?.(model);
    expect(isValid).toBe(true);
  });

  it('should invalidate an incorrect model', () => {
    const validator = getValidator(schema);
    const model = { name: 123 }; // Invalid type
    const isValid = validator?.(model);
    expect(isValid).toBe(false);
  });

  it('should return undefined when schema is invalid', () => {
    const invalidSchema = {
      type: 'object',
      properties: {
        name: { type: 'invalidType' },
      },
    } as unknown as JSONSchema4;

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const validator = getValidator(invalidSchema);
    expect(validator).toBeUndefined();
    consoleErrorSpy.mockRestore();
  });

  it('should log an error when schema compilation fails', () => {
    const invalidSchema = {
      type: 'object',
      properties: {
        name: { type: 'invalidType' },
      },
    } as unknown as JSONSchema4;

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getValidator(invalidSchema);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[KaotoForm Validator]: Could not compile schema', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
