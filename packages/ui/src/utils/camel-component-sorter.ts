import { DynamicCatalogRegistry } from '../dynamic-catalog';
import { ICamelComponentDefinition } from '../models/camel-components-catalog';
import { CatalogKind } from '../models/catalog-kind';
import { IKameletDefinition } from '../models/kamelets-catalog';

/**
 * CamelComponentSorter - Catalog-aware sorting utility for Camel resources
 *
 * This utility provides hierarchical sorting of Camel YAML/XML properties based on
 * the Camel Catalog metadata. It handles:
 * - Entity-level properties (route, from, etc.) using Entity catalog
 * - Pattern-level properties (choice, to, filter, etc.) using Pattern catalog
 * - Component parameters (timer, log, file, etc.) using Component catalog
 * - Language expressions (simple, constant, jq, etc.) using Language catalog
 * - Dual catalog lookup for processors with URIs (from, to, toD, poll)
 * - Recursive sorting of nested structures
 * - Array order preservation (steps, when, doCatch, etc.)
 * - Alphabetical fallback for uncatalogued properties
 *
 * NOTE: This sorter uses cached catalog data for synchronous operation.
 * Catalogs should be pre-loaded before serialization.
 */
export class CamelComponentSorter {
  /**
   * Entity processors that use CatalogKind.Entity
   * Based on CamelComponentSchemaService.getSchema() logic
   */
  private static readonly ENTITY_PROCESSORS = [
    'restConfiguration',
    'rest',
    'errorHandler',
    'onException',
    'onCompletion',
    'intercept',
    'interceptFrom',
    'interceptSendToEndpoint',
    'routeConfiguration',
    'route',
    'from',
  ] as const;

  /**
   * Determines the catalog kind (Entity or Pattern) for a given processor name
   */
  private static getCatalogKind(processorName: string): CatalogKind.Entity | CatalogKind.Pattern {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.ENTITY_PROCESSORS.includes(processorName as any) ? CatalogKind.Entity : CatalogKind.Pattern;
  }

  /**
   * Extracts component name from URI string
   * Examples:
   *   "timer:tick" -> "timer"
   *   "log:info" -> "log"
   *   "file:inbox?fileName=test.txt" -> "file"
   *   "kamelet:kafka-sink?topic=test" -> "kafka-sink" (without kamelet: prefix)
   */
  private static getComponentNameFromUri(uri?: string): string | undefined {
    if (!uri || typeof uri !== 'string') {
      return undefined;
    }

    // Remove query parameters
    const uriWithoutQuery = uri.split('?')[0];

    // Handle kamelet special case: "kamelet:sink-name" -> "sink-name" (strip kamelet: prefix)
    if (uriWithoutQuery.startsWith('kamelet:')) {
      return uriWithoutQuery.substring(8); // Remove "kamelet:" prefix
    }

    // Extract component name before first colon
    const colonIndex = uriWithoutQuery.indexOf(':');
    if (colonIndex === -1) {
      return undefined;
    }

    return uriWithoutQuery.substring(0, colonIndex);
  }

  /**
   * Gets catalog lookup for a component from cache (similar to CamelCatalogService.getCatalogLookup)
   * @param componentName - Component name (e.g., 'timer', 'log', 'kafka-sink')
   * @returns Catalog kind and definition from cache
   */
  private static getCatalogLookup(
    componentName: string,
  ):
    | { catalogKind: CatalogKind.Component; definition: ICamelComponentDefinition | undefined }
    | { catalogKind: CatalogKind.Kamelet; definition: IKameletDefinition | undefined }
    | undefined {
    if (!componentName) {
      return undefined;
    }

    // First try as a Kamelet
    const kameletDefinition = DynamicCatalogRegistry.get().getEntityFromCache(CatalogKind.Kamelet, componentName);

    if (kameletDefinition) {
      return {
        catalogKind: CatalogKind.Kamelet,
        definition: kameletDefinition,
      };
    }

    // Otherwise try as a Component
    const componentDefinition = DynamicCatalogRegistry.get().getEntityFromCache(CatalogKind.Component, componentName);

    return {
      catalogKind: CatalogKind.Component,
      definition: componentDefinition,
    };
  }

  /**
   * Sorts an object by catalog index properties
   * @param properties - Catalog properties with index metadata
   * @param obj - Object to sort
   * @returns Sorted object with same type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static sortObjectByIndex<T extends Record<string, any> = Record<string, any>>(
    properties: Record<string, { index: number }> | undefined,
    obj: T,
  ): T {
    if (!properties || Object.keys(properties).length === 0) {
      return this.sortObjectAlphabetically(obj);
    }

    // Create array of [key, value, index] tuples
    const entries = Object.entries(obj).map(([key, value]) => ({
      key,
      value,
      index: properties[key]?.index ?? Number.MAX_SAFE_INTEGER,
    }));

    // Sort by index, then alphabetically for properties without index
    entries.sort((a, b) => {
      if (a.index !== b.index) {
        return a.index - b.index;
      }
      return a.key.localeCompare(b.key);
    });

    // Reconstruct object in sorted order
    const result = {} as T;
    for (const entry of entries) {
      (result as Record<string, unknown>)[entry.key] = this.processValue(entry.key, entry.value);
    }

    return result;
  }

  /**
   * Sorts object properties alphabetically (fallback when no catalog)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static sortObjectAlphabetically<T extends Record<string, any> = Record<string, any>>(obj: T): T {
    const sortedKeys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
    const result = {} as T;
    for (const key of sortedKeys) {
      (result as Record<string, unknown>)[key] = this.processValue(key, (obj as Record<string, unknown>)[key]);
    }
    return result;
  }

  /**
   * Processes a value recursively based on its type
   * @param propertyName - Name of the property
   * @param value - Value to process
   * @returns Processed value
   */
  private static processValue(propertyName: string, value: unknown): unknown {
    // Handle null, undefined, primitives
    if (value === null || value === undefined || typeof value !== 'object') {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return this.processArray(propertyName, value);
    }

    // Handle objects - check if it's a Camel step
    return this.processObject(propertyName, value as Record<string, unknown>);
  }

  /**
   * Processes an array, preserving order but recursing into elements
   * @param propertyName - Name of the array property
   * @param array - Array to process
   * @returns Processed array with order preserved
   */
  public static processArray(propertyName: string, array: unknown[]): unknown[] {
    // CRITICAL: Always preserve array order
    const results: unknown[] = [];

    // Check if this array property contains known EIP definitions
    // e.g., 'headers' array in 'setHeaders' contains 'setHeader' definitions
    const elementProcessorName = this.getArrayElementProcessorName(propertyName);

    for (let index = 0; index < array.length; index++) {
      const item = array[index];
      if (item === null || item === undefined || typeof item !== 'object') {
        results.push(item);
        continue;
      }

      // If array element is an object, it might be a Camel step
      if (!Array.isArray(item)) {
        // If we know the processor name for array elements, use it for sorting
        const processorName = elementProcessorName || `${propertyName}[${index}]`;
        results.push(this.processObject(processorName, item as Record<string, unknown>));
        continue;
      }

      // Nested array
      results.push(this.processArray(`${propertyName}[${index}]`, item));
    }

    return results;
  }

  /**
   * Maps array property names to their element processor names
   * This handles cases where array elements should be sorted as specific EIPs
   */
  private static getArrayElementProcessorName(arrayPropertyName: string): string | undefined {
    // Map of array property names to their element EIP names
    const arrayElementMap: Record<string, string> = {
      headers: 'setHeader', // setHeaders.headers array contains setHeader definitions
    };

    return arrayElementMap[arrayPropertyName];
  }

  /**
   * Processes an object - detects if it's a Camel step or a generic object
   * @param propertyName - Name of the property
   * @param obj - Object to process
   * @returns Processed object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static processObject<T extends Record<string, any> = Record<string, any>>(propertyName: string, obj: T): T {
    const keys = Object.keys(obj);

    // Empty object
    if (keys.length === 0) {
      return obj;
    }

    // Check if the property name itself is a known processor (e.g., 'from', 'to', 'choice')
    // This handles cases like route.from where 'from' is the property name
    const catalogKind = this.getCatalogKind(propertyName);
    const processorCatalog = DynamicCatalogRegistry.get().getEntityFromCache(catalogKind, propertyName);

    if (processorCatalog) {
      // This is a known processor, sort it as such
      return this.sortProcessorObject(propertyName, obj);
    }

    // Check if the property name is a language expression (simple, constant, jq, etc.)
    const languageCatalog = DynamicCatalogRegistry.get().getEntityFromCache(CatalogKind.Language, propertyName);

    if (languageCatalog) {
      // This is a language expression, sort it using the language catalog
      return this.sortObjectByIndex(languageCatalog.properties as Record<string, { index: number }>, obj);
    }

    // Check if this is a Camel step (single key that's a processor name)
    // Example: { "log": { "message": "test" } }
    if (keys.length === 1) {
      const key = keys[0];
      const value = obj[key];

      // If the single key might be a processor and value is an object, treat as a step
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return this.sortCamelStep(obj);
      }
    }

    // Special case: 'parameters' property should be sorted by component catalog
    if (propertyName === 'parameters') {
      // This is handled by the parent processor's sortProcessorObject
      return this.sortObjectAlphabetically(obj);
    }

    // Generic object - sort alphabetically and recurse
    return this.sortObjectAlphabetically(obj);
  }

  /**
   * Sorts a Camel step object like { "log": { "message": "test" } }
   * @param step - Step object to sort
   * @returns Sorted step object with same type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static sortCamelStep<T extends Record<string, any> = Record<string, any>>(step: T): T {
    const entries = Object.entries(step);

    // Not a valid step
    if (entries.length === 0) {
      return step;
    }

    const result = {} as T;

    for (const [processorName, processorData] of entries) {
      if (typeof processorData === 'object' && processorData !== null && !Array.isArray(processorData)) {
        (result as Record<string, unknown>)[processorName] = this.sortProcessorObject(
          processorName,
          processorData as Record<string, unknown>,
        );
      } else {
        // Primitive or array value (e.g., to: "timer:tick")
        (result as Record<string, unknown>)[processorName] = processorData;
      }
    }

    return result;
  }

  /**
   * Sorts a processor object's properties using catalog metadata
   * Handles dual catalog lookup for processors with URIs (from, to, toD, poll)
   *
   * @param processorName - Name of the processor (e.g., 'route', 'from', 'to', 'choice')
   * @param data - Processor data object
   * @returns Sorted processor object with same type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static sortProcessorObject<T extends Record<string, any> = Record<string, any>>(processorName: string, data: T): T {
    // Get catalog kind (Entity or Pattern)
    const catalogKind = this.getCatalogKind(processorName);

    // Get processor catalog entry from cache
    const processorCatalog = DynamicCatalogRegistry.get().getEntityFromCache(catalogKind, processorName);

    // Handle processors with component URIs (from, to, toD, poll)
    const needsComponentLookup = ['from', 'to', 'toD', 'poll'].includes(processorName);
    let componentCatalog: ICamelComponentDefinition | IKameletDefinition | undefined;

    if (needsComponentLookup) {
      const uri = (data as Record<string, unknown>).uri as string | undefined;
      const componentName = this.getComponentNameFromUri(uri);

      if (componentName) {
        const catalogLookup = this.getCatalogLookup(componentName);
        if (
          catalogLookup?.catalogKind === CatalogKind.Component ||
          catalogLookup?.catalogKind === CatalogKind.Kamelet
        ) {
          componentCatalog = catalogLookup.definition;
        }
      }
    }

    // If no processor catalog, fall back to alphabetical
    if (!processorCatalog?.properties) {
      return this.sortObjectAlphabetically(data);
    }

    // Sort properties by processor catalog index
    const entries = Object.entries(data).map(([key, value]) => ({
      key,
      value,
      index: processorCatalog.properties[key]?.index ?? Number.MAX_SAFE_INTEGER,
    }));

    entries.sort((a, b) => {
      if (a.index !== b.index) {
        return a.index - b.index;
      }
      return a.key.localeCompare(b.key);
    });

    // Reconstruct object with sorted properties
    const result = {} as T;

    for (const entry of entries) {
      const { key, value } = entry;

      // Special handling for 'parameters' property
      if (key === 'parameters' && componentCatalog?.properties) {
        (result as Record<string, unknown>)[key] = this.sortObjectByIndex(
          componentCatalog.properties as Record<string, { index: number }>,
          value as Record<string, unknown>,
        );
      } else {
        (result as Record<string, unknown>)[key] = this.processValue(key, value);
      }
    }

    return result;
  }
}
