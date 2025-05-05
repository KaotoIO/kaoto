import { KaotoSchemaDefinition } from '../models';

export const resolveSchemaWithRef = (
  schema: KaotoSchemaDefinition['schema'],
  definitions: Record<string, KaotoSchemaDefinition['schema']>,
) => {
  if (schema?.$ref === undefined || typeof schema.$ref !== 'string') {
    return schema;
  }

  const { $ref, ...partialWithoutRef } = schema;

  const refPath = $ref.replace('#/definitions/', '');
  const refDefinition = definitions[refPath] ?? {};

  return { ...partialWithoutRef, ...refDefinition };
};
