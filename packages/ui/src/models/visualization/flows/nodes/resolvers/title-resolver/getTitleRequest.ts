import { CatalogKind } from '../../../../../catalog-kind';
import { NodeTitleResolver } from './node-title-resolver';

/**
 * Requests the display title for a node based on its catalog kind and name.
 * This function resolves titles from the catalog asynchronously.
 *
 * @param catalogKind - The type of catalog item (Component, Processor, Kamelet, etc.)
 * @param name - The name/identifier of the catalog item
 * @param componentName - Optional component name for processor nodes (e.g., 'timer' for a 'from' processor)
 * @returns Promise resolving to the human-readable title
 */
export async function getTitleRequest(catalogKind: CatalogKind, name: string, componentName?: string): Promise<string> {
  let title: string;

  switch (catalogKind) {
    case CatalogKind.Entity:
      title = await NodeTitleResolver.getEntityTitle(name);
      break;
    case CatalogKind.Kamelet:
      title = await NodeTitleResolver.getKameletTitle(name);
      break;
    case CatalogKind.Component:
      title = await NodeTitleResolver.getComponentTitle(name);
      break;
    case CatalogKind.Processor:
    case CatalogKind.Pattern:
      title = await NodeTitleResolver.getProcessorTitle(name, componentName);
      break;
    case CatalogKind.TestAction:
    case CatalogKind.TestActionGroup:
    case CatalogKind.TestContainer:
    case CatalogKind.TestEndpoint:
    case CatalogKind.TestFunction:
    case CatalogKind.TestValidationMatcher:
      title = await NodeTitleResolver.getTestActionTitle(name);
      break;
    default:
      title = name;
  }

  return title || name;
}
