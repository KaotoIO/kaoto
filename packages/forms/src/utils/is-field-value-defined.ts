import { JSONSchema4TypeName } from 'json-schema';
import { isDefined } from './is-defined';

export const isFieldValueDefined = (
  schemaType: JSONSchema4TypeName[] | JSONSchema4TypeName | undefined,
  value: unknown,
): boolean => {
  let isFieldDefined = false;
  // When field of any type in not defined with any input, the `value` returns `undefined` and therefore isFieldDefined return false
  if (isDefined(value)) {
    // Check if the value is a valid value
    switch (schemaType) {
      case 'object':
        isFieldDefined = typeof value === 'object' && Object.keys(value).length > 0;
        break;
      case 'array':
        isFieldDefined = Array.isArray(value) && value.length > 0;
        break;
      default:
        isFieldDefined = true;
    }
  }
  return isFieldDefined;
};
