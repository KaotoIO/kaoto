import { CatalogKind } from '../../../../../catalog-kind';
import { NodeTooltipResolver } from './node-tooltip-resolver';

/**
 * Resolves the tooltip through the NodeTooltipResolver method matching the catalog kind.
 * The methods are looked up on every call, so they keep their `this` binding and can be spied on.
 */
function resolveTooltip(catalogKind: CatalogKind, name: string): Promise<string> | undefined {
  switch (catalogKind) {
    case CatalogKind.Entity:
      return NodeTooltipResolver.getEntityTooltip(name);
    case CatalogKind.Kamelet:
      return NodeTooltipResolver.getKameletTooltip(name);
    case CatalogKind.Component:
      return NodeTooltipResolver.getComponentTooltip(name);
    case CatalogKind.Processor:
    case CatalogKind.Pattern:
      return NodeTooltipResolver.getProcessorTooltip(name);
    case CatalogKind.TestAction:
    case CatalogKind.TestActionGroup:
    case CatalogKind.TestContainer:
    case CatalogKind.TestEndpoint:
    case CatalogKind.TestFunction:
    case CatalogKind.TestValidationMatcher:
      return NodeTooltipResolver.getTestActionTooltip(name, catalogKind);
    default:
      return undefined;
  }
}

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
  const tooltipRequest = resolveTooltip(catalogKind, name);
  let tooltip: string;

  if (tooltipRequest) {
    tooltip = await tooltipRequest;
  } else {
    tooltip = name;
  }

  // Use description as fallback if tooltip is empty or same as name
  if (!tooltip || tooltip === name) {
    tooltip = description || name;
  }

  return `${name}: ${tooltip}`;
}
