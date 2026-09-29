import { JSONSchema4 } from 'json-schema';
import { isDefined } from './is-defined';

/**
 * A utility class for filtering JSON Schema properties based on search criteria.
 *
 * Provides recursive filtering of schema properties by matching against:
 * - Property key names
 * - Schema title labels
 * - Runtime model values
 *
 * @example
 * ```typescript
 * const filtered = SchemaPropertyFilter.filter(
 *   schema.properties,
 *   'username',
 *   undefined,
 *   currentFormData
 * );
 * ```
 */
export class SchemaPropertyFilter {
  /**
   * Filters schema properties based on the provided criteria.
   *
   * @param properties - The schema properties to filter
   * @param filter - The filter term (case-insensitive, spaces should be removed by caller)
   * @param omitFields - Optional list of property keys to always exclude
   * @param model - Optional current form data for value-based matching
   * @returns Filtered properties object
   */
  public static filter(
    properties: JSONSchema4['properties'],
    filter: string,
    omitFields?: string[],
    model?: Record<string, unknown>,
  ): JSONSchema4['properties'] {
    // Early return for undefined properties
    if (!isDefined(properties)) {
      return {};
    }

    // Early return for empty filter (optimization)
    if (filter.length === 0) {
      if (!omitFields?.length) {
        return properties; // Return original reference
      }
      // Only apply omit filter
      return Object.fromEntries(Object.entries(properties).filter(([key]) => !omitFields.includes(key)));
    }

    // Filter properties based on various criteria
    const filteredProperties = Object.entries(properties).reduce(
      (accumulator, [propertyKey, propertySchema]) => {
        // Skip omitted fields
        if (omitFields?.includes(propertyKey)) {
          return accumulator;
        }

        let matchedSchema: JSONSchema4 | undefined;

        // Handle object properties with nested properties
        if (this.hasNestedProperties(propertySchema)) {
          matchedSchema = this.filterObjectProperty(propertySchema, propertyKey, filter, model);
        }
        // Handle array properties with object items
        else if (this.hasArrayItemProperties(propertySchema)) {
          matchedSchema = this.filterArrayProperty(propertySchema, propertyKey, filter, model);
        }
        // Handle primitive properties
        else if (this.matchesPrimitiveProperty(propertySchema, propertyKey, filter, model)) {
          matchedSchema = propertySchema;
        }

        // Add to accumulator if matched
        if (matchedSchema) {
          accumulator[propertyKey] = matchedSchema;
        }

        return accumulator;
      },
      {} as NonNullable<JSONSchema4['properties']>,
    );

    return filteredProperties;
  }

  /**
   * Type guard to check if a schema definition has nested properties.
   */
  private static hasNestedProperties(
    schema: JSONSchema4,
  ): schema is JSONSchema4 & { properties: NonNullable<JSONSchema4['properties']> } {
    return schema.type === 'object' && isDefined(schema.properties);
  }

  /**
   * Type guard to check if a schema definition is an array with object items that have properties.
   */
  private static hasArrayItemProperties(schema: JSONSchema4): schema is JSONSchema4 & {
    items: JSONSchema4 & { properties: NonNullable<JSONSchema4['properties']> };
  } {
    return (
      schema.type === 'array' &&
      isDefined(schema.items) &&
      !Array.isArray(schema.items) &&
      isDefined((schema.items as JSONSchema4).properties)
    );
  }

  /**
   * Type guard to check if a value is a primitive that can be stringified for matching.
   */
  private static isMatchablePrimitive(value: unknown): value is string | number | boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  /**
   * Checks if a property key or schema title matches the filter term.
   */
  private static matchesKeyOrTitle(propertyKey: string, schema: JSONSchema4, filter: string): boolean {
    const keyMatches = propertyKey.toLowerCase().includes(filter);
    const titleMatches = typeof schema.title === 'string' && schema.title.toLowerCase().includes(filter);
    return keyMatches || titleMatches;
  }

  /**
   * Checks if a model value matches the filter term.
   */
  private static matchesModelValue(modelValue: unknown, filter: string): boolean {
    if (!this.isMatchablePrimitive(modelValue)) {
      return false;
    }
    return String(modelValue).toLowerCase().includes(filter);
  }

  /**
   * Extracts the model slice for a nested property, ensuring type safety.
   */
  private static getNestedModelSlice(
    model: Record<string, unknown> | undefined,
    propertyKey: string,
  ): Record<string, unknown> | undefined {
    if (!model) return undefined;

    const value = model[propertyKey];
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return value as Record<string, unknown>;
  }

  /**
   * Extracts the array model slice for a property, ensuring type safety.
   */
  private static getArrayModelSlice(
    model: Record<string, unknown> | undefined,
    propertyKey: string,
  ): unknown[] | undefined {
    if (!model) return undefined;

    const value = model[propertyKey];
    if (!Array.isArray(value)) {
      return undefined;
    }

    return value;
  }

  /**
   * Filters nested object properties recursively.
   *
   * Returns the schema definition if:
   * 1. The property key or title matches the filter (returns full unfiltered definition)
   * 2. Any nested child property matches the filter (returns filtered definition)
   *
   * @param schema - The object schema definition to filter
   * @param propertyKey - The key of this property in the parent schema
   * @param filter - The lowercase filter term to match against
   * @param model - Optional model data for value-based matching
   * @returns Filtered schema definition or undefined if no matches
   */
  private static filterObjectProperty(
    schema: JSONSchema4,
    propertyKey: string,
    filter: string,
    model?: Record<string, unknown>,
  ): JSONSchema4 | undefined {
    // Stage 1: Check if the container itself matches (key or title)
    if (this.matchesKeyOrTitle(propertyKey, schema, filter)) {
      return schema; // Return full unfiltered definition
    }

    // Stage 2: Recursively filter nested properties
    if (!this.hasNestedProperties(schema)) {
      return undefined; // No nested properties to filter
    }

    const nestedModel = this.getNestedModelSlice(model, propertyKey);
    const filteredNestedProperties = this.filter(schema.properties, filter, undefined, nestedModel);

    // Stage 3: Return filtered definition if any nested properties matched
    if (filteredNestedProperties && Object.keys(filteredNestedProperties).length > 0) {
      return { ...schema, properties: filteredNestedProperties };
    }

    return undefined;
  }

  /**
   * Filters array properties based on item schema or item values.
   *
   * Returns the schema definition if:
   * 1. The property key or title matches the filter (returns full definition)
   * 2. Any item property in the schema matches the filter
   * 3. Any item value in the model matches the filter
   *
   * @param schema - The array schema definition to filter
   * @param propertyKey - The key of this property in the parent schema
   * @param filter - The lowercase filter term to match against
   * @param model - Optional model data for value-based matching
   * @returns The schema definition or undefined if no matches
   */
  private static filterArrayProperty(
    schema: JSONSchema4,
    propertyKey: string,
    filter: string,
    model?: Record<string, unknown>,
  ): JSONSchema4 | undefined {
    // Stage 1: Check if the container itself matches (key or title)
    if (this.matchesKeyOrTitle(propertyKey, schema, filter)) {
      return schema; // Return full definition
    }

    // Stage 2: Check if this array has object items with properties
    if (!this.hasArrayItemProperties(schema)) {
      return undefined; // Can't filter arrays without item properties
    }

    const itemProperties = schema.items.properties;

    // Stage 3: Check if any item property in the schema matches
    const schemaFilteredProperties = this.filter(itemProperties, filter);
    const hasSchemaMatch = schemaFilteredProperties && Object.keys(schemaFilteredProperties).length > 0;

    if (hasSchemaMatch) {
      return schema; // Schema-level match found
    }

    // Stage 4: Check if any item value in the model matches
    const arrayModel = this.getArrayModelSlice(model, propertyKey);
    if (!arrayModel) {
      return undefined; // No model data to check
    }

    const hasValueMatch = arrayModel.some((item) => {
      // Skip null/undefined items
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return false;
      }

      const itemModel = item as Record<string, unknown>;
      const itemFilteredProperties = this.filter(itemProperties, filter, undefined, itemModel);

      return itemFilteredProperties && Object.keys(itemFilteredProperties).length > 0;
    });

    return hasValueMatch ? schema : undefined;
  }

  /**
   * Filters a single property based on key, title, or model value.
   *
   * @param schema - The property schema definition
   * @param propertyKey - The key of this property
   * @param filter - The lowercase filter term to match against
   * @param model - Optional model data for value-based matching
   * @returns True if the property matches the filter
   */
  private static matchesPrimitiveProperty(
    schema: JSONSchema4,
    propertyKey: string,
    filter: string,
    model?: Record<string, unknown>,
  ): boolean {
    // Check key or title match
    if (this.matchesKeyOrTitle(propertyKey, schema, filter)) {
      return true;
    }

    // Check model value match
    if (model) {
      const modelValue = model[propertyKey];
      return this.matchesModelValue(modelValue, filter);
    }

    return false;
  }
}
