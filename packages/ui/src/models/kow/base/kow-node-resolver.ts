/**
 * IKowNodeResolver - Strategy pattern for building KOW trees
 *
 * The resolver knows how to interpret a specific domain's data.
 * Each domain (Camel, Citrus) implements its own resolver.
 *
 * @typeParam TType - The node type enum
 * @typeParam TCatalog - The catalog entry type
 */
import { KowChildDescriptor } from './kow-node';

export interface IKowNodeResolver<TType extends string, TCatalog> {
  /**
   * Determine the node type from name and data
   */
  getNodeType(name: string, data: unknown): TType;

  /**
   * Get catalog entry for a node
   */
  getCatalogEntry(name: string, type: TType): TCatalog | undefined;

  /**
   * Find child nodes from data
   * Returns array of child descriptors that will become child nodes
   */
  getChildNodes(name: string, data: Record<string, unknown>, type: TType): KowChildDescriptor[];

  /**
   * Get properties metadata from catalog entry
   * Used for sorting by index
   */
  getPropertiesMetadata(catalogEntry: TCatalog): Record<string, { index: number }> | undefined;
}
