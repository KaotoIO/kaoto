import { getIconRequest } from '../../../../icon-resolver/getIconRequest';
import { getTooltipRequest } from '../../../../tooltip-resolver/getTooltipRequest';
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
    const [iconResult, tooltip] = await Promise.all([
      getIconRequest(catalogKind, vizNode.data.name),
      getTooltipRequest(catalogKind, vizNode.data.name, vizNode.data.description),
    ]);
    vizNode.data.iconUrl = iconResult.icon;
    vizNode.data.iconAlt = iconResult.alt;
    vizNode.data.description = tooltip;
  }
}
