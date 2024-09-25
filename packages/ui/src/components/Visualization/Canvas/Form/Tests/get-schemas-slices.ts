import {
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
  KaotoSchemaDefinition,
} from '../../../../../models';

export const getSchemasSlice = (
  catalogMap:
    | Record<string, ICamelComponentDefinition>
    | Record<string, ICamelProcessorDefinition>
    | Record<string, IKameletDefinition>
    | undefined,
  range: { start: number; end: number | undefined },
): [string, KaotoSchemaDefinition['schema']][] => {
  if (!catalogMap) return [];

  return Object.entries(catalogMap)
    .slice(range.start, range.end)
    .map(([name, { propertiesSchema }]) => [name, propertiesSchema]);
};
