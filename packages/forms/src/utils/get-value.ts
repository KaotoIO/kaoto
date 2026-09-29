import { isDefined } from './is-defined';

export const ROOT_PATH = '#';

/**
 * Get value from model by property path
 * The property path can be a nested path like `a.b.c`
 * @param model Model object
 * @param propertyPath Property path to get the value from the model
 * @param defaultValue  Default value if the property path does not exist in the model
 */
export const safeGetValue = (model: unknown, propertyPath: string | string[], defaultValue: unknown = undefined) => {
  if (!isDefined(model)) return defaultValue;
  if (propertyPath === ROOT_PATH) {
    return model;
  }

  const path = Array.isArray(propertyPath) ? propertyPath : propertyPath.split('.');

  return path.reduce((acc, property) => {
    if (!isDefined(acc)) return defaultValue;

    if (Array.isArray(acc)) {
      const index = parseInt(property, 10);
      if (index >= 0 && index < acc.length) {
        return acc[index];
      }
    }

    if (typeof acc === 'object' && property in acc) {
      return (acc as Record<string, unknown>)[property];
    }

    return defaultValue;
  }, model);
};
