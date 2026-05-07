import { CatalogKind } from '../../../../../catalog-kind';
import { NodeTooltipResolver } from './node-tooltip-resolver';

/**
 * Mapping of catalog kinds to their respective resolver methods.
 */
const TOOLTIP_RESOLVER_MAP: Partial<Record<CatalogKind, (name: string, catalogKind: CatalogKind) => Promise<string>>> =
  {
    [CatalogKind.Entity]: NodeTooltipResolver.getEntityTooltip,
    [CatalogKind.Kamelet]: NodeTooltipResolver.getKameletTooltip,
    [CatalogKind.Component]: NodeTooltipResolver.getComponentTooltip,
    [CatalogKind.Processor]: NodeTooltipResolver.getProcessorTooltip,
    [CatalogKind.Pattern]: NodeTooltipResolver.getProcessorTooltip,
    [CatalogKind.TestAction]: NodeTooltipResolver.getTestActionTooltip,
    [CatalogKind.TestActionGroup]: NodeTooltipResolver.getTestActionTooltip,
    [CatalogKind.TestContainer]: NodeTooltipResolver.getTestActionTooltip,
    [CatalogKind.TestEndpoint]: NodeTooltipResolver.getTestActionTooltip,
    [CatalogKind.TestFunction]: NodeTooltipResolver.getTestActionTooltip,
    [CatalogKind.TestValidationMatcher]: NodeTooltipResolver.getTestActionTooltip,
  };

/**
 * Requests a tooltip description for a given catalog item.
 * This function resolves tooltip content from the catalog asynchronously.
 *
 * @param catalogKind - The type of catalog item (Component, Processor, Kamelet, etc.)
 * @param name - The name/identifier of the catalog item
 * @param description - Fallback description if catalog lookup fails
 * @returns Promise resolving to the tooltip description text in format "name: description"
 */
export async function getTooltipRequest(catalogKind: CatalogKind, name: string, description: string): Promise<string> {
  const resolver = TOOLTIP_RESOLVER_MAP[catalogKind];
  let tooltip: string;

  if (resolver) {
    tooltip = await resolver(name, catalogKind);
  } else {
    tooltip = name;
  }

  // Use description as fallback if tooltip is empty or same as name
  if (!tooltip || tooltip === name) {
    tooltip = description || name;
  }

  return `${name}: ${tooltip}`;
}
