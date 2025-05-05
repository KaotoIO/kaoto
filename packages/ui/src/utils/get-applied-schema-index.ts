import { KaotoSchemaDefinition } from '../models/kaoto-schema';
import { OneOfSchemas } from './get-oneof-schema-list';
import { weightSchemaAgainstModel } from './weight-schemas-against-model';

export const getAppliedSchemaIndex = (
  model: unknown,
  oneOfSchemaList: OneOfSchemas[],
  definitions: KaotoSchemaDefinition['schema']['definitions'] = {},
): number => {
  const schemaPoints = oneOfSchemaList
    .map(({ schema }, index) => {
      const points = weightSchemaAgainstModel(model, schema, definitions);
      return { index, points };
    })
    .filter((weigthedSchema) => weigthedSchema.points > 0)
    .sort((a, b) => b.points - a.points);

  return schemaPoints.length > 0 ? schemaPoints[0].index : -1;
};
