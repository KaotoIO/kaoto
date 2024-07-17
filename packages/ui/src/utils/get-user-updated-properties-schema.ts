import { KaotoSchemaDefinition } from '../models';
import { isDefined } from './is-defined';

export function getUserUpdatedPropertiesSchema(
  schemaProperties: KaotoSchemaDefinition['schema'],
  inputModel: Record<string, unknown>,
): KaotoSchemaDefinition['schema'] {
  if (!isDefined(schemaProperties) || !isDefined(inputModel)) return {};

  const nonDefaultFormSchema = Object.entries(schemaProperties).reduce(
    (acc, [property, definition]) => {
      if (property in inputModel && isDefined(inputModel[property])) {
        if (
          definition['type'] === 'string' ||
          definition['type'] === 'boolean' ||
          definition['type'] === 'integer' ||
          definition['type'] === 'number'
        ) {
          if ('default' in definition) {
            if (!(definition['default'] == inputModel[property])) {
              acc[property] = definition;
            }
          } else {
            acc[property] = definition;
          }
        } else if (definition['type'] === 'object' && Object.keys(inputModel[property] as object).length > 0) {
          if ('properties' in definition) {
            const subSchema = getUserUpdatedPropertiesSchema(
              definition['properties'],
              inputModel[property] as Record<string, unknown>,
            );
            acc[property] = { ...definition, properties: subSchema };
          } else {
            acc[property] = definition;
          }
        } else if (definition['type'] === 'array' && (inputModel[property] as unknown[]).length > 0) {
          acc[property] = definition;
        }
      }

      return acc;
    },
    {} as KaotoSchemaDefinition['schema'],
  );

  return nonDefaultFormSchema;
}
