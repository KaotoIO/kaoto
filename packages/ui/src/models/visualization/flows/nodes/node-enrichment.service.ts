import { CatalogKind } from '../../../catalog-kind';
import { IVisualizationNode } from '../../base-visual-entity';
import { CamelRouteVisualEntityData } from '../support/camel-component-types';
import { getIconRequest } from './resolvers/icon-resolver/getIconRequest';
import { getProcessorIconTooltipRequest } from './resolvers/tooltip-resolver/getProcessorIconTooltipRequest';
import { getTooltipRequest } from './resolvers/tooltip-resolver/getTooltipRequest';

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
    const processorName = (vizNode.data as CamelRouteVisualEntityData).processorName;
    const results = await Promise.allSettled([
      getIconRequest(catalogKind, vizNode.data.name),
      getTooltipRequest(catalogKind, vizNode.data.name, vizNode.data.description),
      getProcessorIconTooltipRequest(processorName),
    ]);

    // Handle icon result
    if (results[0].status === 'fulfilled') {
      vizNode.data.iconUrl = results[0].value.icon;
      vizNode.data.iconAlt = results[0].value.alt;
    } else {
      console.warn(`Failed to fetch icon for ${vizNode.data.name}:`, results[0].reason);
    }

    // Handle tooltip result
    if (results[1].status === 'fulfilled') {
      vizNode.data.description = results[1].value;
    } else {
      console.warn(`Failed to fetch tooltip for ${vizNode.data.name}:`, results[1].reason);
    }

    // Handle processor icon tooltip result
    if (results[2].status === 'fulfilled') {
      vizNode.data.processorIconTooltip = results[2].value;
    } else {
      console.warn(`Failed to fetch processor icon tooltip for ${processorName}:`, results[2].reason);
      vizNode.data.processorIconTooltip = '';
    }
  }
}
