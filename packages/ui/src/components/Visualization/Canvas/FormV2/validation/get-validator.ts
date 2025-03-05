import Ajv, { ValidateFunction } from 'ajv';
import { KaotoSchemaDefinition } from '../../../../../models';

export const getValidator = (schema: KaotoSchemaDefinition['schema']) => {
  const ajv = new Ajv({ strict: false, allErrors: true, useDefaults: true });

  let validator: ValidateFunction | undefined;
  try {
    validator = ajv.compile(schema);
  } catch (error) {
    console.error('[KaotoForm Validator]: Could not compile schema', error);
  }

  return validator;
};
