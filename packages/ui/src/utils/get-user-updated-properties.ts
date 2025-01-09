import { KaotoSchemaDefinition } from '../models';
import { isDefined } from './is-defined';
import { resolveRefIfNeeded } from './resolve-ref-if-needed';

export function getUserUpdatedProperties(
  schemaProperties?: KaotoSchemaDefinition['schema']['properties'],
  inputModel?: Record<string, unknown>,
  resolveFromSchema?: KaotoSchemaDefinition['schema'],
): KaotoSchemaDefinition['schema']['properties'] {
  if (!isDefined(schemaProperties) || !isDefined(inputModel) || !isDefined(resolveFromSchema)) return {};

  const nonDefaultFormSchema = Object.entries(schemaProperties).reduce(
    (acc, [property, definition]) => {
      const inputValue = inputModel[property];
      if (!isDefined(inputValue)) return acc;

      if (
        definition['type'] === 'string' ||
        definition['type'] === 'boolean' ||
        definition['type'] === 'integer' ||
        definition['type'] === 'number'
      ) {
        if (definition['default'] != inputValue) {
          acc![property] = definition;
        }
      } else if (
        definition['type'] === 'object' &&
        'properties' in definition &&
        Object.keys(inputValue as object).length > 0
      ) {
        const subSchema = getUserUpdatedProperties(
          definition['properties'],
          inputValue as Record<string, unknown>,
          resolveFromSchema,
        );
        if (subSchema && Object.keys(subSchema).length > 0) {
          acc![property] = { ...definition, properties: subSchema };
        }
      } else if ('$ref' in definition) {
        const objectDefinition = resolveRefIfNeeded(definition, resolveFromSchema);
        const subSchema = getUserUpdatedProperties(
          objectDefinition['properties'] as KaotoSchemaDefinition['schema']['properties'],
          inputValue as Record<string, unknown>,
          resolveFromSchema,
        );
        if (subSchema && Object.keys(subSchema).length > 0) {
          acc![property] = { ...objectDefinition, properties: subSchema };
        }
      } else if (definition['type'] === 'array' && (inputValue as unknown[]).length > 0) {
        acc![property] = definition;
      }

      return acc;
    },
    {} as KaotoSchemaDefinition['schema']['properties'],
  );

  return nonDefaultFormSchema!;
}
