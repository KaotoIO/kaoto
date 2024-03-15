import { KaotoSchemaDefinition } from '../models/kaoto-schema';
import { weightSchemaProperties } from './weight-schema-properties';

export const getAppliedSchemaIndex = (
  model: Record<string, unknown>,
  oneOfList: KaotoSchemaDefinition['schema'][],
  rootSchema: KaotoSchemaDefinition['schema'],
): number => {
  const schemaPoints = oneOfList
    .map((oneOf, index) => {
      const points = weightSchemaProperties(model, oneOf, rootSchema);
      return { index, points };
    })
    .filter((oneOf) => oneOf.points > 0)
    .sort((a, b) => b.points - a.points);

  return schemaPoints.length > 0 ? schemaPoints[0].index : -1;
};
