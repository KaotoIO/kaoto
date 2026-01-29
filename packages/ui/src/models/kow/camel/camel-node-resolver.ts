/**
 * CamelNodeResolver - Strategy for building Camel KOW trees
 *
 * Knows how to:
 * - Determine node types (Entity, Eip, Language, etc.)
 * - Find catalog entries
 * - Discover child nodes from Camel data structures
 */
import { ICamelComponentDefinition } from '../../../camel-catalog-index';
import { ICamelDataformatDefinition } from '../../../camel-dataformats-catalog';
import { ICamelLanguageDefinition } from '../../../camel-languages-catalog';
import { ICamelLoadBalancerDefinition } from '../../../camel-loadbalancers-catalog';
import { ICamelProcessorDefinition } from '../../../camel-processors-catalog';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog';
import { CamelUriHelper } from '../../../utils/camel-uri-helper';
import { CatalogKind } from '../../catalog-kind';
import { IKowNodeResolver, KowChildDescriptor } from '../base';
import {
  ENTITY_PROCESSORS,
  isDataformat,
  isLanguage,
  isLoadbalancer,
  isPattern,
  PRIMITIVE_PROPERTIES,
  STEPS_PROPERTIES,
} from './camel-catalog-utils';
import { CamelCatalogEntry } from './camel-kow-node';
import { CamelKowNodeType } from './camel-kow-node-type';

export class CamelNodeResolver implements IKowNodeResolver<CamelKowNodeType, CamelCatalogEntry> {
  /** Lazy getter for registry to avoid initialization issues during import */
  private get registry() {
    return DynamicCatalogRegistry.get();
  }

  getNodeType(name: string, _data: unknown): CamelKowNodeType {
    // Check if it's an entity
    if (ENTITY_PROCESSORS.has(name)) {
      return CamelKowNodeType.Entity;
    }

    // Check if it's a language
    if (isLanguage(name)) {
      return CamelKowNodeType.Language;
    }

    // Check if it's a dataformat
    if (isDataformat(name)) {
      return CamelKowNodeType.Dataformat;
    }

    // Check if it's a loadbalancer
    if (isLoadbalancer(name)) {
      return CamelKowNodeType.Loadbalancer;
    }

    // Default to EIP
    return CamelKowNodeType.Eip;
  }

  getCatalogEntry(name: string, type: CamelKowNodeType): CamelCatalogEntry | undefined {
    switch (type) {
      case CamelKowNodeType.Entity:
        return this.registry.getEntityFromCache(CatalogKind.Entity, name) as ICamelProcessorDefinition | undefined;

      case CamelKowNodeType.Eip:
        return this.registry.getEntityFromCache(CatalogKind.Pattern, name) as ICamelProcessorDefinition | undefined;

      case CamelKowNodeType.Language:
        return this.registry.getEntityFromCache(CatalogKind.Language, name) as
          | ICamelLanguageDefinition
          | undefined as CamelCatalogEntry;

      case CamelKowNodeType.Dataformat:
        return this.registry.getEntityFromCache(CatalogKind.Dataformat, name) as
          | ICamelDataformatDefinition
          | undefined as CamelCatalogEntry;

      case CamelKowNodeType.Loadbalancer:
        return this.registry.getEntityFromCache(CatalogKind.Loadbalancer, name) as
          | ICamelLoadBalancerDefinition
          | undefined as CamelCatalogEntry;

      case CamelKowNodeType.Component:
        return this.registry.getEntityFromCache(CatalogKind.Component, name) as ICamelComponentDefinition | undefined;

      default:
        return undefined;
    }
  }

  getChildNodes(name: string, data: Record<string, unknown>, type: CamelKowNodeType): KowChildDescriptor[] {
    const children: KowChildDescriptor[] = [];

    // Get catalog entry for this node to understand its structure
    const catalogEntry = this.getCatalogEntry(name, type);
    const catalogProperties = this.getPropertiesMetadata(catalogEntry);

    for (const [key, value] of Object.entries(data)) {
      // Skip primitive properties
      if (PRIMITIVE_PROPERTIES.has(key)) {
        continue;
      }

      // Skip null/undefined values
      if (value === null || value === undefined) {
        continue;
      }

      // Skip primitive values (strings, numbers, booleans)
      if (typeof value !== 'object') {
        continue;
      }

      // Handle arrays (steps, when, doCatch, etc.)
      if (Array.isArray(value)) {
        children.push(...this.processArrayProperty(key, value, catalogProperties));
        continue;
      }

      // Handle objects - check if it's a nested processor or parameters
      children.push(...this.processObjectProperty(key, value as Record<string, unknown>, data));
    }

    return children;
  }

  getPropertiesMetadata(catalogEntry: CamelCatalogEntry | undefined): Record<string, { index: number }> | undefined {
    if (!catalogEntry) return undefined;

    // Handle processor definitions
    if ('properties' in catalogEntry && catalogEntry.properties) {
      return catalogEntry.properties as unknown as Record<string, { index: number }>;
    }

    return undefined;
  }

  /**
   * Process an array property and return child descriptors
   */
  private processArrayProperty(
    key: string,
    value: unknown[],
    _catalogProperties?: Record<string, { index: number }>,
  ): KowChildDescriptor[] {
    const children: KowChildDescriptor[] = [];

    // Check if this is a steps array or similar
    if (STEPS_PROPERTIES.has(key)) {
      // Steps contain wrapped EIP objects like { to: { uri: '...' } }
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const stepChildren = this.extractEipFromWrapper(item as Record<string, unknown>, i);
          children.push(...stepChildren);
        }
      }
    } else {
      // Other arrays (when, doCatch, headers, etc.)
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          children.push({
            name: key,
            data: item,
            isArrayElement: true,
            index: i,
          });
        }
      }
    }

    return children;
  }

  /**
   * Process an object property and return child descriptors
   */
  private processObjectProperty(
    key: string,
    value: Record<string, unknown>,
    _parentData: Record<string, unknown>,
  ): KowChildDescriptor[] {
    // Special case: parameters property - not a child node, just properties to sort
    if (key === 'parameters') {
      return [];
    }

    // If it's a recognized processor type, it's a child node
    if (
      ENTITY_PROCESSORS.has(key) ||
      isLanguage(key) ||
      isDataformat(key) ||
      isLoadbalancer(key) ||
      isPattern(key)
    ) {
      return [
        {
          name: key,
          data: value,
          isArrayElement: false,
        },
      ];
    }

    // Check if the object contains a wrapped EIP (like setBody containing simple/constant)
    const wrappedEips = this.extractLanguageOrDataformat(value);
    if (wrappedEips.length > 0) {
      return wrappedEips;
    }

    return [];
  }

  /**
   * Extract EIP name and data from a step wrapper object
   * Steps are typically { processorName: processorConfig }
   */
  private extractEipFromWrapper(wrapper: Record<string, unknown>, index: number): KowChildDescriptor[] {
    const keys = Object.keys(wrapper);
    if (keys.length === 0) return [];

    // The first key is the EIP name
    const eipName = keys[0];
    const eipData = wrapper[eipName];

    return [
      {
        name: eipName,
        data: eipData,
        isArrayElement: true,
        index,
      },
    ];
  }

  /**
   * Extract language or dataformat from an object
   */
  private extractLanguageOrDataformat(obj: Record<string, unknown>): KowChildDescriptor[] {
    const children: KowChildDescriptor[] = [];

    for (const [key, value] of Object.entries(obj)) {
      if (isLanguage(key) || isDataformat(key) || isLoadbalancer(key)) {
        children.push({
          name: key,
          data: value,
          isArrayElement: false,
        });
      }
    }

    return children;
  }

  /**
   * Get component name from URI
   */
  getComponentNameFromUri(uri: string): string | undefined {
    return CamelUriHelper.getComponentNameFromUri(uri);
  }

  /**
   * Get component catalog entry from URI
   */
  getComponentCatalogEntry(uri: string): ICamelComponentDefinition | undefined {
    const componentName = this.getComponentNameFromUri(uri);
    if (!componentName) return undefined;

    return this.registry.getEntityFromCache(CatalogKind.Component, componentName) as
      | ICamelComponentDefinition
      | undefined;
  }
}
