import { isDefined } from '.';

export function getUserUpdatedPropertiesSchema(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj1: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj2: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  if (!isDefined(obj1) || !isDefined(obj2)) return {};

  const nonDefaultFormSchema = Object.entries(obj1).reduce(
    (acc, item) => {
      if (item[0] in obj2 && isDefined(obj2[item[0]])) {
        if (item[1]['type'] === 'string' || item[1]['type'] === 'boolean' || item[1]['type'] === 'integer') {
          if ('default' in item[1]) {
            if (!(item[1]['default'] == obj2[item[0]])) {
              acc[item[0]] = item[1];
            }
          } else {
            acc[item[0]] = item[1];
          }
        } else if (item[1]['type'] === 'object' && Object.keys(obj2[item[0]]).length > 0) {
          if ('properties' in item[1]) {
            const subSchema = getUserUpdatedPropertiesSchema(item[1]['properties'], obj2[item[0]]);
            acc[item[0]] = { ...item[1], properties: subSchema };
          } else {
            acc[item[0]] = item[1];
          }
        } else if (item[1]['type'] === 'array' && obj2[item[0]].length > 0) {
          acc[item[0]] = item[1];
        }
      }

      return acc;
    },
    {} as Record<string, unknown>,
  );

  return nonDefaultFormSchema;
}
