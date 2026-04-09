import { getIconRequest } from '../../../../icon-resolver/getIconRequest';
import { CatalogKind } from '../../../catalog-kind';
import { IVisualizationNode } from '../../base-visual-entity';

/**
 * Service for enriching visualization nodes with catalog-derived properties.
 * This includes resolving icons, titles, and descriptions from the catalog.
 */
export class NodeEnrichmentService {
  /**
   * Enriches a visualization node with catalog properties (icon, title, description).
   * @param vizNode - The visualization node to enrich
   * @param componentLookup - The component lookup result containing processor/component names
   */
  static async enrichNodeFromCatalog(vizNode: IVisualizationNode, catalogKind: CatalogKind): Promise<void> {
    const { icon, alt } = await getIconRequest(catalogKind, vizNode.data.name);
    vizNode.data.iconUrl = icon;
    vizNode.data.iconAlt = alt;
  }
}
