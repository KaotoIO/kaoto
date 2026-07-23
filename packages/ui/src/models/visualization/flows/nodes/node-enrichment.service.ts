import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../catalog-kind';
import { IVisualizationNode } from '../../base-visual-entity';
import { CamelRouteVisualEntityData } from '../support/camel-component-types';
import { getIconRequest } from './resolvers/icon-resolver/getIconRequest';
import { getTitleRequest } from './resolvers/title-resolver/getTitleRequest';
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
   * @param catalogKind - The catalog kind (Component or Processor)
   */
  static async enrichNodeFromCatalog(vizNode: IVisualizationNode, catalogKind: CatalogKind): Promise<void> {
    const routeData = vizNode.data as CamelRouteVisualEntityData;
    const processorName = routeData.processorName;
    const componentName = routeData.componentName;

    // Special handling for From nodes with Entity catalog kind
    // Use the component or kamelet for enrichment instead of the processor
    let effectiveCatalogKind = catalogKind;
    let effectiveName = vizNode.data.name;

    if (catalogKind === CatalogKind.Entity && processorName === ('from' as keyof ProcessorDefinition)) {
      // Check if we have a component (secondaryNodeId) or kamelet (tertiaryNodeId)
      if (vizNode.data.tertiaryNodeId) {
        effectiveCatalogKind = vizNode.data.tertiaryNodeId.catalogKind;
        effectiveName = vizNode.data.tertiaryNodeId.name;
      } else if (vizNode.data.secondaryNodeId) {
        effectiveCatalogKind = vizNode.data.secondaryNodeId.catalogKind;
        effectiveName = vizNode.data.secondaryNodeId.name;
      }
    }

    // For Processor/Pattern catalog kinds, use processorName as the identifier
    // For other kinds (Component, Kamelet, etc.), use the effective name
    const titleIdentifier =
      effectiveCatalogKind === CatalogKind.Processor || effectiveCatalogKind === CatalogKind.Pattern
        ? processorName
        : effectiveName;

    const getSchema = () => vizNode.fetchSchema();

    const results = await Promise.allSettled([
      getIconRequest(effectiveCatalogKind, effectiveName),
      getTooltipRequest(effectiveCatalogKind, effectiveName, vizNode.data.description),
      getProcessorIconTooltipRequest(processorName),
      getTitleRequest(effectiveCatalogKind, titleIdentifier, componentName),
      getSchema(),
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
    }

    // Handle title result
    if (results[3].status === 'fulfilled') {
      vizNode.data.title = results[3].value;
    } else {
      console.warn(`Failed to fetch title for ${vizNode.data.name}:`, results[3].reason);
    }

    // Handle schema result
    if (results[4].status === 'fulfilled') {
      vizNode.data.schema = results[4].value;
    } else {
      console.warn(`Failed to fetch schema for ${vizNode.data.name}:`, results[4].reason);
    }
  }
}
