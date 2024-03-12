import { UnknownObject } from 'uniforms';

/**
 * Copied from JSONSchemaBridge
 * @see related issue: https://github.com/vazco/uniforms/issues/1307
 */
function resolveRef(reference: string, schema: UnknownObject) {
  return reference
    .split('/')
    .filter((part) => part && part !== '#')
    .reduce((definition, next) => definition[next] as UnknownObject, schema);
}

export function resolveRefIfNeeded(partial: UnknownObject, schema: UnknownObject): UnknownObject {
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
