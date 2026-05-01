import { CatalogKind } from '../../../../../catalog-kind';
import { NodeTooltipResolver } from './node-tooltip-resolver';

/**
 * Requests a tooltip description for a given catalog item.
 * This function resolves tooltip content from the catalog asynchronously.
 *
 * @param catalogKind - The type of catalog item (Component, Processor, Kamelet, etc.)
 * @param name - The name/identifier of the catalog item
 * @returns Promise resolving to the tooltip description text
 */
export async function getTooltipRequest(catalogKind: CatalogKind, name: string, description: string): Promise<string> {
  let tooltip: string;

  switch (catalogKind) {
    case CatalogKind.Entity:
      tooltip = await NodeTooltipResolver.getEntityTooltip(name);
      break;
    case CatalogKind.Kamelet:
      tooltip = await NodeTooltipResolver.getKameletTooltip(name);
      break;
    case CatalogKind.Component:
      tooltip = await NodeTooltipResolver.getComponentTooltip(name);
      break;
    case CatalogKind.Processor:
    case CatalogKind.Pattern:
      tooltip = await NodeTooltipResolver.getProcessorTooltip(name);
      break;
    case CatalogKind.TestAction:
    case CatalogKind.TestActionGroup:
    case CatalogKind.TestContainer:
    case CatalogKind.TestEndpoint:
    case CatalogKind.TestFunction:
    case CatalogKind.TestValidationMatcher:
      tooltip = await NodeTooltipResolver.getTestActionTooltip(name, catalogKind);
      break;
    default:
      tooltip = name;
  }

  if (!tooltip || tooltip === name) {
    tooltip = description || name;
  }

  return tooltip;
}
