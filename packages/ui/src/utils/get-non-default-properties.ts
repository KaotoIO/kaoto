import type { JSONSchemaType } from 'ajv';

export function getNonDefaultProperties(
  obj1: JSONSchemaType<unknown>,
  obj2: Record<string, unknown>,
): Record<string, unknown> {
  const newModelUpdated = Object.entries(obj2.parameters as object).reduce(
    (acc: [string, unknown][], currentValue: [string, unknown]) => {
      if (!(obj1[currentValue[0]]['default'] == currentValue[1])) {
        acc.push(currentValue);
      }
      return acc;
    },
    [],
  );
  return { ...obj2, parameters: Object.fromEntries(newModelUpdated) };
}
