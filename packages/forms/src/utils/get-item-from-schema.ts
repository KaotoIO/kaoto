import { JSONSchema4 } from 'json-schema';
import { resolveSchemaWithRef } from './resolve-schema-with-ref';

export const getItemFromSchema = (schema: JSONSchema4, definitions: Record<string, JSONSchema4>) => {
  const resolvedSchema = resolveSchemaWithRef(schema, definitions);
  const defaultValue = resolvedSchema.default;
  const properties = resolvedSchema.properties ?? {};
  const required = Array.isArray(resolvedSchema.required) ? resolvedSchema.required : [];

  switch (resolvedSchema.type) {
    case 'string':
      return defaultValue ?? '';
    case 'boolean':
      return defaultValue ?? false;
    case 'number':
      return defaultValue ?? 0;
    case 'object':
      return Object.entries(properties).reduce(
        (acc, [key, value]) => {
          if (required.includes(key)) {
            acc[key] = getItemFromSchema(value, definitions);
          }

          return acc;
        },
        {} as Record<string, unknown>,
      );
    default:
      return {};
  }
};
