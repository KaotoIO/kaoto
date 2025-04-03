import { KaotoSchemaDefinition } from '../models';

/**
 * Copied from JSONSchemaBridge
 * @see related issue: https://github.com/vazco/uniforms/issues/1307
 */
function resolveRef(reference: string, schema: KaotoSchemaDefinition['schema']) {
  return reference
    .split('/')
    .filter((part) => part && part !== '#')
    .reduce((definition, next) => definition[next], schema);
}

export function resolveRefIfNeeded(
  partial: object,
  schema: KaotoSchemaDefinition['schema'],
): KaotoSchemaDefinition['schema'] {
  if (!('$ref' in partial)) {
    return partial;
  }

  const { $ref, ...partialWithoutRef } = partial;
  return resolveRefIfNeeded(
    // @ts-expect-error The `partial` and `schema` should be typed more precisely.
    Object.assign({}, partialWithoutRef, resolveRef($ref, schema)),
    schema,
  );
}

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
