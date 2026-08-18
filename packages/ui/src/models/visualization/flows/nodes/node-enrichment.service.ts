import { CatalogKind } from '../../../catalog-kind';
import { EntityType } from '../../../entities';
import { IVisualizationNode } from '../../base-visual-entity';
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
   * Derives the catalog kind used for enrichment from the node's identity fields.
   * Mirrors the catalog-kind selection previously done in node mappers.
   */
  static deriveCatalogKind(vizNode: IVisualizationNode): CatalogKind {
    const { primaryNodeId, secondaryNodeId, tertiaryNodeId } = vizNode.data;

    if (tertiaryNodeId?.catalogKind === CatalogKind.Kamelet) {
      return CatalogKind.Kamelet;
    }

    // Citrus test root uses Entity on primaryNodeId but was always enriched with TestAction.
    if (primaryNodeId?.catalogKind === CatalogKind.Entity && primaryNodeId.name === EntityType.Test) {
      return CatalogKind.TestAction;
    }

    if (primaryNodeId?.catalogKind === CatalogKind.Entity) {
      return CatalogKind.Entity;
    }

    // Citrus action nodes always store TestAction on primaryNodeId and use TestAction for enrichment.
    if (primaryNodeId?.catalogKind === CatalogKind.TestAction) {
      return CatalogKind.TestAction;
    }

    if (primaryNodeId?.catalogKind === CatalogKind.Kamelet) {
      return CatalogKind.Kamelet;
    }

    if (secondaryNodeId?.catalogKind === CatalogKind.Component) {
      return CatalogKind.Component;
    }

    if (primaryNodeId?.catalogKind === CatalogKind.Pattern) {
      return CatalogKind.Pattern;
    }

    if (primaryNodeId?.catalogKind === CatalogKind.Processor) {
      return CatalogKind.Processor;
    }

    return primaryNodeId?.catalogKind ?? CatalogKind.Pattern;
  }

  /**
   * Enriches every non-placeholder node in the visualization tree after the structure is linked.
   */
  static async enrichVisualizationTree(root: IVisualizationNode): Promise<void> {
    const visited = new Set<string>();

    const visit = async (node: IVisualizationNode): Promise<void> => {
      if (visited.has(node.id)) {
        return;
      }
      visited.add(node.id);

      if (!node.data.isPlaceholder) {
        await NodeEnrichmentService.enrichNodeFromCatalog(node, NodeEnrichmentService.deriveCatalogKind(node));
      }

      for (const child of node.getChildren() ?? []) {
        await visit(child);
      }
    };

    await visit(root);
  }

  private static async enrichNodeFromCatalog(vizNode: IVisualizationNode, catalogKind: CatalogKind): Promise<void> {
    // Special handling for From nodes with Entity catalog kind
    // Use the component or kamelet for enrichment instead of the processor
    let effectiveCatalogKind = catalogKind;
    let effectiveName = vizNode.data.name;
    let redirected = false;

    if (catalogKind === CatalogKind.Entity && vizNode.data.primaryNodeId?.name === 'from') {
      // Check if we have a component (secondaryNodeId) or kamelet (tertiaryNodeId)
      if (vizNode.data.tertiaryNodeId) {
        effectiveCatalogKind = vizNode.data.tertiaryNodeId.catalogKind;
        effectiveName = vizNode.data.tertiaryNodeId.name;
        redirected = true;
      } else if (vizNode.data.secondaryNodeId) {
        effectiveCatalogKind = vizNode.data.secondaryNodeId.catalogKind;
        effectiveName = vizNode.data.secondaryNodeId.name;
        redirected = true;
      }
    }

    // For Processor/Pattern catalog kinds, use the primary node name as the title identifier
    // and pass the secondary node (component) as an overlay for the title resolver.
    // Fall back to effectiveName when no primary id is set (e.g. placeholder nodes).
    // When redirected (from-node Entity special case), the effective name is already the full
    // identity — no component overlay is needed.
    const isProcessorLike =
      effectiveCatalogKind === CatalogKind.Processor || effectiveCatalogKind === CatalogKind.Pattern;
    const titleIdentifier = isProcessorLike ? (vizNode.data.primaryNodeId?.name ?? effectiveName) : effectiveName;
    const titleComponentName = redirected ? undefined : vizNode.data.secondaryNodeId?.name;

    const [iconResult, tooltipResult, processorTooltipResult, titleResult, schemaResult] = await Promise.allSettled([
      getIconRequest(effectiveCatalogKind, effectiveName),
      getTooltipRequest(effectiveCatalogKind, effectiveName, vizNode.data.description),
      getProcessorIconTooltipRequest(vizNode.data.primaryNodeId?.name),
      getTitleRequest(effectiveCatalogKind, titleIdentifier, titleComponentName),
      vizNode.fetchSchema(),
    ]);

    NodeEnrichmentService.applyEnrichmentResults(vizNode, {
      iconResult,
      tooltipResult,
      processorTooltipResult,
      titleResult,
      schemaResult,
    });
  }

  private static applyEnrichmentResults(
    vizNode: IVisualizationNode,
    {
      iconResult,
      tooltipResult,
      processorTooltipResult,
      titleResult,
      schemaResult,
    }: {
      iconResult: PromiseSettledResult<{ icon: string; alt: string }>;
      tooltipResult: PromiseSettledResult<string>;
      processorTooltipResult: PromiseSettledResult<string>;
      titleResult: PromiseSettledResult<string>;
      schemaResult: PromiseSettledResult<
        ReturnType<IVisualizationNode['fetchSchema']> extends Promise<infer R> ? R : never
      >;
    },
  ): void {
    if (iconResult.status === 'fulfilled') {
      vizNode.data.iconUrl = iconResult.value.icon;
      vizNode.data.iconAlt = iconResult.value.alt;
    } else {
      console.warn(`Failed to fetch icon for ${vizNode.data.name}:`, iconResult.reason);
    }

    if (tooltipResult.status === 'fulfilled') {
      vizNode.data.description = tooltipResult.value;
    } else {
      console.warn(`Failed to fetch tooltip for ${vizNode.data.name}:`, tooltipResult.reason);
    }

    if (processorTooltipResult.status === 'fulfilled') {
      vizNode.data.processorIconTooltip = processorTooltipResult.value;
    } else {
      console.warn(
        `Failed to fetch processor icon tooltip for ${vizNode.data.primaryNodeId?.name}:`,
        processorTooltipResult.reason,
      );
    }

    if (titleResult.status === 'fulfilled') {
      vizNode.data.title = titleResult.value;
    } else {
      console.warn(`Failed to fetch title for ${vizNode.data.name}:`, titleResult.reason);
    }

    if (schemaResult.status === 'fulfilled') {
      vizNode.data.schema = schemaResult.value;
    } else {
      console.warn(`Failed to fetch schema for ${vizNode.data.name}:`, schemaResult.reason);
    }
  }
}
