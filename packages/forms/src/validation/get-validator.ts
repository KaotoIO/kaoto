import Ajv, { Options, ValidateFunction } from 'ajv';
import { JSONSchema4 } from 'json-schema';

export const getValidator = <T = unknown>(schema: JSONSchema4, options: Options | undefined = undefined) => {
  // The `format` keyword is used as a UI hint by the Camel catalog (`bean:*`, `password`, `expression`, ...).
  // No format validation is registered (ajv-formats is not used), so skip it instead of logging a warning
  // for every unknown format. Revisit this option if `ajv-formats` is ever added.
  const ajv = new Ajv({ strict: false, validateFormats: false, allErrors: true, useDefaults: true, ...options });

  let validator: ValidateFunction<T> | undefined;
  try {
    validator = ajv.compile<T>(schema);
  } catch (error) {
    console.error('[KaotoForm Validator]: Could not compile schema', error);
  }

  return validator;
};
