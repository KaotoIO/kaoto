import { KaotoSchemaDefinition } from '../models';
import { isDefined } from './is-defined';

export function getRequiredPropertiesSchema(schema: KaotoSchemaDefinition['schema']): KaotoSchemaDefinition['schema'] {
  if (!isDefined(schema)) return {};

  const schemaProperties = schema.properties;
  const requiredProperties = schema.required as string[];

  if (isDefined(requiredProperties) && isDefined(schemaProperties)) {
    const requiredFormSchema = Object.entries(schemaProperties).reduce(
      (acc, [property, definition]) => {
        if (definition['type'] === 'object' && 'properties' in definition) {
          const subSchema = getRequiredPropertiesSchema(definition);
          acc[property] = subSchema;
        } else {
          if (requiredProperties.indexOf(property) > -1) acc[property] = definition;
        }

        return acc;
      },
      {} as KaotoSchemaDefinition['schema'],
    );
    return { ...schema, properties: requiredFormSchema };
  }

  return { ...schema, properties: {} };
}
