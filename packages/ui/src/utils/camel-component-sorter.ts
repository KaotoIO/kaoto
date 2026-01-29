/**
 * CamelComponentSorter - Catalog-aware sorting utility for Camel resources
 *
 * This utility uses the KOW (Kaoto Object Walker) infrastructure to sort
 * Camel YAML/XML properties based on the Camel Catalog metadata.
 *
 * Architecture:
 * - Creates a Camel KOW tree from the input data
 * - Applies the SortingVisitor to produce sorted output
 *
 * Handles:
 * - Entity-level properties (route, from, etc.) using Entity catalog
 * - Pattern-level properties (choice, to, filter, etc.) using Pattern catalog
 * - Component parameters (timer, log, file, etc.) using Component catalog
 * - Language expressions (simple, constant, jq, etc.) using Language catalog
 * - Dataformat definitions (json, xml, csv, etc.) using Dataformat catalog
 * - Loadbalancer configurations using Loadbalancer catalog
 * - Recursive sorting of nested structures
 * - Array order preservation (steps, when, doCatch, etc.)
 * - Alphabetical fallback for uncatalogued properties
 *
 * NOTE: This sorter uses cached catalog data for synchronous operation.
 * Catalogs should be pre-loaded before serialization.
 */
import { createCamelKowTree, SortingVisitor } from '../models/kow';

export class CamelComponentSorter {
  private static readonly sortingVisitor = new SortingVisitor();

  /**
   * Sorts a processor object's properties using catalog metadata
   *
   * Uses the KOW tree and SortingVisitor to recursively sort all properties
   * according to their catalog index values.
   *
   * @param processorName - Name of the processor (e.g., 'route', 'from', 'to', 'choice')
   * @param data - Processor data object
   * @returns Sorted processor object with same type
   *
   * @example
   * // Sort a route definition
   * const sortedRoute = CamelComponentSorter.sortProcessorObject('route', routeData);
   *
   * @example
   * // Sort a from definition with component parameters
   * const sortedFrom = CamelComponentSorter.sortProcessorObject('from', fromData);
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static sortProcessorObject<T extends Record<string, any> = Record<string, any>>(
    processorName: string,
    data: T,
  ): T {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    // Create KOW tree and apply SortingVisitor
    const tree = createCamelKowTree(processorName, data);
    return tree.accept(this.sortingVisitor) as T;
  }
}
