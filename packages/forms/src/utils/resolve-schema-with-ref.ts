import { JSONSchema4 } from 'json-schema';

export const resolveSchemaWithRef = (schema: JSONSchema4, definitions: Record<string, JSONSchema4>) => {
  if (schema?.$ref === undefined || typeof schema.$ref !== 'string') {
    return schema;
  }

  const { $ref, ...partialWithoutRef } = schema;

  const refPath = $ref.replace('#/definitions/', '');
  const refDefinition = definitions[refPath] ?? {};

  return { ...partialWithoutRef, ...refDefinition };
};
