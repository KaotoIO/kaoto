import { KaotoSchemaDefinition } from '../models';
import { extractGroup } from './get-tagged-field-from-string';
import { isDefined } from './is-defined';

interface FieldGroups {
  common: Record<string, KaotoSchemaDefinition['schema']>;
  groups: [string, Record<string, KaotoSchemaDefinition['schema']>][];
}

export const getFieldGroups = (properties?: KaotoSchemaDefinition['schema']['properties']): FieldGroups => {
  if (!isDefined(properties)) return { common: {}, groups: [] };

  const groupedProperties = Object.entries(properties).reduce(
    (acc, [name, definition]) => {
      // "$comment": "group:advanced" or "$comment": "group:consumer (advanced)"
      const group = extractGroup('group', definition.$comment);

      if (group === '' || group === 'common' || group === 'producer' || group === 'consumer') {
        acc.common[name] = definition;
      } else {
        acc.groups[group] ??= {};
        acc.groups[group][name] = definition;
      }

      return acc;
    },
    { common: {}, groups: {} } as {
      common: Record<string, KaotoSchemaDefinition['schema']>;
      groups: Record<string, Record<string, KaotoSchemaDefinition['schema']>>;
    },
  );

  /** Prioritize advanced properties */
  const groupArray = Object.entries(groupedProperties.groups).sort((a, b) => {
    if (a[0] === 'advanced') {
      return 1;
    } else if (b[0] === 'advanced') {
      return -1;
    }
    return 0;
  });

  return { common: groupedProperties.common, groups: groupArray };
};
