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
   * Sorts a processor object's properties using catalog metadata
   * Handles dual catalog lookup for processors with URIs (from, to, toD, poll)
   *
   * @param processorName - Name of the processor (e.g., 'route', 'from', 'to', 'choice')
   * @param data - Processor data object
   * @returns Sorted processor object with same type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public static sortProcessorObject<T extends Record<string, any> = Record<string, any>>(
    processorName: string,
    data: T,
  ): T {
    /* TODO: Redo implementation based on:
      1. Get the entity catalog entry (from, intercept, errorHandler, etc.)
      2. If found, sort its first level properties by them, otherwise sort alphabetically
      3. Determine if the entity has uri (I think for all cases is yes)
      4. Get the component parameters
      5. If found, sort by them, otherwise sort alphabetically
      6. If the entity has steps (check how steps is referred in the catalog, I think it says output=true)
      7. Iterate over the steps property and start all over again

      We should contemplate cases for:
      - Expressions
      - Languages
      - Dataformats
      - Entities
      - EIPs
      - Components

      We should also have explicit methods for sorting properties alphabetically and based on an index
      this way the sort process would be cleaner as one step would be identifying the entity/eip/etc and
      another step would be sort by index or alphabetically if not found
    */
  }
}
