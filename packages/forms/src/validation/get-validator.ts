import Ajv, { Options, ValidateFunction } from 'ajv';
import { JSONSchema4 } from 'json-schema';

export const getValidator = <T = unknown>(schema: JSONSchema4, options: Options | undefined = undefined) => {
  const ajv = new Ajv({ strict: false, allErrors: true, useDefaults: true, ...(options ?? {}) });

  let validator: ValidateFunction<T> | undefined;
  try {
    validator = ajv.compile<T>(schema);
  } catch (error) {
    console.error('[KaotoForm Validator]: Could not compile schema', error);
  }

  return validator;
};
