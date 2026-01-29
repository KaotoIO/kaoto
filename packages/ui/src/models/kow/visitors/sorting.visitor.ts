/**
 * SortingVisitor - Sorts properties at each node using catalog index
 *
 * Traverses the KOW tree and produces a new data structure with all
 * properties sorted according to their catalog index values.
 */
import { ICamelComponentDefinition } from '../../../camel-catalog-index';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CamelUriHelper } from '../../../utils/camel-uri-helper';
import { CamelPropertyCommon } from '../../camel-properties-common';
import { CatalogKind } from '../../catalog-kind';
import { IKowNode, IKowNodeVisitor } from '../base';
import {
  CamelCatalogEntry,
  ICamelKowNode,
  isDataformat,
  isEntity,
  isLanguage,
  isLoadbalancer,
  isPattern,
} from '../camel';
import { CamelKowNodeType } from '../camel/camel-kow-node-type';

/**
 * Result of sorting a node
 */
export interface SortedNodeResult {
  data: Record<string, unknown>;
}

/**
 * SortingVisitor for Camel KOW trees
 *
 * Visits each node and sorts its properties by catalog index.
 * Handles special cases like:
 * - Component parameters (sorted by Component catalog)
 * - Language expressions
 * - Dataformat definitions
 */
export class SortingVisitor implements IKowNodeVisitor<CamelKowNodeType, Record<string, unknown>> {
  /** Lazy getter for registry to avoid initialization issues during import */
  private get registry() {
    return DynamicCatalogRegistry.get();
  }

  visit(node: IKowNode<unknown, CamelKowNodeType, unknown>): Record<string, unknown> {
    const data = node.data as Record<string, unknown>;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data as Record<string, unknown>;
    }

    // Get catalog properties for sorting
    const catalogEntry = node.catalogEntry as CamelCatalogEntry | undefined;
    const catalogProperties = this.getPropertiesFromCatalog(catalogEntry);

    // Sort first-level properties by catalog index
    const sortedData = this.sortByIndex(data, catalogProperties);

    // Process each property
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(sortedData)) {
      result[key] = this.processValue(key, value, node as ICamelKowNode);
    }

    return result;
  }

  /**
   * Process a value based on its type
   */
  private processValue(key: string, value: unknown, parentNode: ICamelKowNode): unknown {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return value;
    }

    // Handle primitives
    if (typeof value !== 'object') {
      return value;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return this.processArray(key, value, parentNode);
    }

    // Handle objects
    return this.processObject(key, value as Record<string, unknown>, parentNode);
  }

  /**
   * Process an array value
   */
  private processArray(key: string, arr: unknown[], parentNode: ICamelKowNode): unknown[] {
    // Check if this is a steps array
    if (key === 'steps') {
      return this.processStepsArray(arr);
    }

    // Other arrays: process each element
    return arr.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return item;
      }
      // Array elements like 'when', 'doCatch' are treated as their own processors
      return this.sortProcessorObject(key, item as Record<string, unknown>);
    });
  }

  /**
   * Process a steps array
   */
  private processStepsArray(steps: unknown[]): unknown[] {
    return steps.map((step) => {
      if (!step || typeof step !== 'object' || Array.isArray(step)) {
        return step;
      }
      return this.processStep(step as Record<string, unknown>);
    });
  }

  /**
   * Process a single step (wrapper object like { to: { uri: '...' } })
   */
  private processStep(step: Record<string, unknown>): Record<string, unknown> {
    const keys = Object.keys(step);
    if (keys.length === 0) return step;

    const processorName = keys[0];
    const processorConfig = step[processorName];

    if (!processorConfig || typeof processorConfig !== 'object' || Array.isArray(processorConfig)) {
      return step;
    }

    const sortedConfig = this.sortProcessorObject(processorName, processorConfig as Record<string, unknown>);
    return { [processorName]: sortedConfig };
  }

  /**
   * Process an object value
   */
  private processObject(key: string, obj: Record<string, unknown>, parentNode: ICamelKowNode): Record<string, unknown> {
    // Handle parameters property - use component catalog
    if (key === 'parameters') {
      const uri = parentNode.getUri();
      if (uri) {
        return this.sortComponentParameters(obj, uri);
      }
      return this.sortAlphabetically(obj);
    }

    // Check if it's a known processor (entity, EIP, language, etc.)
    if (this.isKnownProcessor(key)) {
      return this.sortProcessorObject(key, obj);
    }

    // Check for nested language/dataformat
    const languageResult = this.tryProcessAsLanguage(obj);
    if (languageResult) return languageResult;

    const dataformatResult = this.tryProcessAsDataformat(obj);
    if (dataformatResult) return dataformatResult;

    const loadbalancerResult = this.tryProcessAsLoadbalancer(obj);
    if (loadbalancerResult) return loadbalancerResult;

    // Generic object: recursively process
    return this.processGenericObject(obj, parentNode);
  }

  /**
   * Sort a processor object by its catalog properties
   */
  private sortProcessorObject(processorName: string, data: Record<string, unknown>): Record<string, unknown> {
    // Get catalog entry for this processor
    const catalogEntry = this.getCatalogEntryForProcessor(processorName);
    const catalogProperties = this.getPropertiesFromCatalog(catalogEntry);

    // Sort properties
    const sortedData = this.sortByIndex(data, catalogProperties);

    // Recursively process values
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(sortedData)) {
      result[key] = this.processValueForProcessor(key, value, processorName, data);
    }

    return result;
  }

  /**
   * Process a value within a processor context
   */
  private processValueForProcessor(
    key: string,
    value: unknown,
    processorName: string,
    parentData: Record<string, unknown>,
  ): unknown {
    if (value === null || value === undefined || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      if (key === 'steps') {
        return this.processStepsArray(value);
      }
      return value.map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return item;
        }
        return this.sortProcessorObject(key, item as Record<string, unknown>);
      });
    }

    // Handle parameters
    if (key === 'parameters') {
      const uri = parentData.uri as string | undefined;
      if (uri) {
        return this.sortComponentParameters(value as Record<string, unknown>, uri);
      }
      return this.sortAlphabetically(value as Record<string, unknown>);
    }

    // Check if it's a known processor
    if (this.isKnownProcessor(key)) {
      return this.sortProcessorObject(key, value as Record<string, unknown>);
    }

    // Check for nested language/dataformat/loadbalancer
    const langResult = this.tryProcessAsLanguage(value as Record<string, unknown>);
    if (langResult) return langResult;

    const dfResult = this.tryProcessAsDataformat(value as Record<string, unknown>);
    if (dfResult) return dfResult;

    const lbResult = this.tryProcessAsLoadbalancer(value as Record<string, unknown>);
    if (lbResult) return lbResult;

    // Generic object
    return this.processGenericObjectSimple(value as Record<string, unknown>);
  }

  /**
   * Sort component parameters using Component catalog
   */
  private sortComponentParameters(params: Record<string, unknown>, uri: string): Record<string, unknown> {
    const componentName = CamelUriHelper.getComponentNameFromUri(uri);
    if (!componentName) {
      return this.sortAlphabetically(params);
    }

    const componentEntry = this.registry.getEntityFromCache(CatalogKind.Component, componentName) as
      | ICamelComponentDefinition
      | undefined;

    if (componentEntry?.properties) {
      return this.sortByIndex(params, componentEntry.properties as unknown as Record<string, CamelPropertyCommon>);
    }

    return this.sortAlphabetically(params);
  }

  /**
   * Try to process object as a language expression
   */
  private tryProcessAsLanguage(obj: Record<string, unknown>): Record<string, unknown> | null {
    for (const key of Object.keys(obj)) {
      if (isLanguage(key)) {
        const langValue = obj[key];
        if (langValue && typeof langValue === 'object' && !Array.isArray(langValue)) {
          const langEntry = this.registry.getEntityFromCache(CatalogKind.Language, key);
          const langProperties = (langEntry as { properties?: Record<string, CamelPropertyCommon> })?.properties;
          const sortedLangValue = this.sortByIndex(langValue as Record<string, unknown>, langProperties);

          const otherKeys: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj)) {
            if (k !== key) {
              otherKeys[k] = v;
            }
          }

          return { ...otherKeys, [key]: sortedLangValue };
        }
        return obj;
      }
    }
    return null;
  }

  /**
   * Try to process object as a dataformat
   */
  private tryProcessAsDataformat(obj: Record<string, unknown>): Record<string, unknown> | null {
    for (const key of Object.keys(obj)) {
      if (isDataformat(key)) {
        const dfValue = obj[key];
        if (dfValue && typeof dfValue === 'object' && !Array.isArray(dfValue)) {
          const dfEntry = this.registry.getEntityFromCache(CatalogKind.Dataformat, key);
          const dfProperties = (dfEntry as { properties?: Record<string, CamelPropertyCommon> })?.properties;
          const sortedDfValue = this.sortByIndex(dfValue as Record<string, unknown>, dfProperties);

          const otherKeys: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj)) {
            if (k !== key) {
              otherKeys[k] = v;
            }
          }

          return { ...otherKeys, [key]: sortedDfValue };
        }
        return obj;
      }
    }
    return null;
  }

  /**
   * Try to process object as a loadbalancer
   */
  private tryProcessAsLoadbalancer(obj: Record<string, unknown>): Record<string, unknown> | null {
    for (const key of Object.keys(obj)) {
      if (isLoadbalancer(key)) {
        const lbValue = obj[key];
        if (lbValue && typeof lbValue === 'object' && !Array.isArray(lbValue)) {
          const lbEntry = this.registry.getEntityFromCache(CatalogKind.Loadbalancer, key);
          const lbProperties = (lbEntry as { properties?: Record<string, CamelPropertyCommon> })?.properties;
          const sortedLbValue = this.sortByIndex(lbValue as Record<string, unknown>, lbProperties);

          const otherKeys: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(obj)) {
            if (k !== key) {
              otherKeys[k] = v;
            }
          }

          return { ...otherKeys, [key]: sortedLbValue };
        }
        return obj;
      }
    }
    return null;
  }

  /**
   * Process a generic object recursively
   */
  private processGenericObject(obj: Record<string, unknown>, parentNode: ICamelKowNode): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = this.processValue(key, value, parentNode);
    }
    return result;
  }

  /**
   * Process a generic object without parent node context
   */
  private processGenericObjectSimple(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined || typeof value !== 'object') {
        result[key] = value;
        continue;
      }
      if (Array.isArray(value)) {
        result[key] = value;
        continue;
      }
      result[key] = this.processGenericObjectSimple(value as Record<string, unknown>);
    }
    return result;
  }

  /**
   * Get catalog entry for a processor
   */
  private getCatalogEntryForProcessor(processorName: string): CamelCatalogEntry | undefined {
    // Check entity catalog first
    if (isEntity(processorName)) {
      return this.registry.getEntityFromCache(CatalogKind.Entity, processorName) as CamelCatalogEntry | undefined;
    }

    // Check pattern catalog
    return this.registry.getEntityFromCache(CatalogKind.Pattern, processorName) as CamelCatalogEntry | undefined;
  }

  /**
   * Get properties from a catalog entry
   */
  private getPropertiesFromCatalog(
    catalogEntry: CamelCatalogEntry | undefined,
  ): Record<string, CamelPropertyCommon> | undefined {
    if (!catalogEntry) return undefined;

    if ('properties' in catalogEntry) {
      return catalogEntry.properties as unknown as Record<string, CamelPropertyCommon>;
    }

    return undefined;
  }

  /**
   * Sort object keys by catalog index
   */
  private sortByIndex<T extends Record<string, unknown>>(
    obj: T,
    catalogProperties: Record<string, CamelPropertyCommon> | undefined,
  ): T {
    if (!catalogProperties) {
      return this.sortAlphabetically(obj);
    }

    const keys = Object.keys(obj);
    const sortedKeys = keys.sort((a, b) => {
      const indexA = catalogProperties[a]?.index;
      const indexB = catalogProperties[b]?.index;

      if (indexA !== undefined && indexB !== undefined) {
        return indexA - indexB;
      }
      if (indexA !== undefined) return -1;
      if (indexB !== undefined) return 1;
      return a.localeCompare(b);
    });

    const result = {} as T;
    for (const key of sortedKeys) {
      (result as Record<string, unknown>)[key] = obj[key];
    }
    return result;
  }

  /**
   * Sort object keys alphabetically
   */
  private sortAlphabetically<T extends Record<string, unknown>>(obj: T): T {
    const keys = Object.keys(obj);
    const sortedKeys = keys.sort((a, b) => a.localeCompare(b));

    const result = {} as T;
    for (const key of sortedKeys) {
      (result as Record<string, unknown>)[key] = obj[key];
    }
    return result;
  }

  /**
   * Check if processor is a known processor (entity or pattern)
   */
  private isKnownProcessor(name: string): boolean {
    return isEntity(name) || isPattern(name);
  }
}
