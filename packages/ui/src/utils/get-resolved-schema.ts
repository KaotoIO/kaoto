import { KaotoSchemaDefinition } from '../models/kaoto-schema';
import { isDefined } from './is-defined';
import { resolveRefIfNeeded } from './resolve-ref-if-needed';

export const getResolvedSchema = (
  oneOf: KaotoSchemaDefinition['schema'],
  rootSchema?: KaotoSchemaDefinition['schema'],
) => {
  if (!(isDefined(oneOf?.properties) && isDefined(rootSchema))) return oneOf;

  const resolvedProperties = Object.keys(oneOf.properties).reduce(
    (acc, key) => {
      if (!(isDefined(oneOf.properties) && key in oneOf.properties)) return acc;

      const resolvedOneOfProperty = resolveRefIfNeeded(oneOf.properties[key], rootSchema);
      acc[key] = resolvedOneOfProperty;
      return acc;
    },
    {} as KaotoSchemaDefinition['schema'],
  );

  return Object.assign({}, oneOf, { properties: resolvedProperties });
};
