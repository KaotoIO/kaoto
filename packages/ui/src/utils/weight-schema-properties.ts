import { JSONSchema4 } from 'json-schema';
import { KaotoSchemaDefinition } from '../models/kaoto-schema';
import { isDefined } from './is-defined';
import { resolveRefIfNeeded } from './resolve-ref-if-needed';

export const weightSchemaProperties = (
  model: Record<string, unknown>,
  oneOf: KaotoSchemaDefinition['schema'],
  rootSchema: KaotoSchemaDefinition['schema'],
) => {
  if (!isDefined(model)) return 0;

  return Object.keys(model).reduce((points, key) => {
    if (!isDefined(oneOf.properties)) return points;
    if (!(key in oneOf.properties)) return points;

    points += 1;

    const oneOfProperty = resolveRefIfNeeded(oneOf.properties[key], rootSchema);
    if (typeof model[key] === oneOfProperty.type) {
      points += 10;
    }

    if (oneOfProperty.type === 'object' && typeof model[key] === 'object') {
      points += weightSchemaProperties(model[key] as Record<string, unknown>, oneOfProperty, rootSchema);
    }

    if (!isDefined(oneOfProperty.type) && Array.isArray(oneOfProperty.oneOf)) {
      const nestedOneOfPoints = oneOfProperty.oneOf.reduce((nestedPoints: number, nestedOneOf: JSONSchema4) => {
        nestedPoints += weightSchemaProperties(model[key] as Record<string, unknown>, nestedOneOf, rootSchema);
        return nestedPoints;
      }, 0);

      points += nestedOneOfPoints;
    }

    return points;
  }, 0);
};
