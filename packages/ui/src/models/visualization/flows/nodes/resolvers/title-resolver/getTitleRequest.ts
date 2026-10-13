import { CatalogKind } from '@kaoto/editor-api';

import { NodeTitleResolver } from './node-title-resolver';

/**
 * Resolves the title through the NodeTitleResolver method matching the catalog kind.
 * The methods are looked up on every call, so they keep their `this` binding and can be spied on.
 */
function resolveTitle(catalogKind: CatalogKind, name: string, componentName?: string): Promise<string> | undefined {
  switch (catalogKind) {
    case CatalogKind.Entity:
      return NodeTitleResolver.getEntityTitle(name);
    case CatalogKind.Kamelet:
      return NodeTitleResolver.getKameletTitle(name);
    case CatalogKind.Component:
      return NodeTitleResolver.getComponentTitle(name);
    case CatalogKind.Processor:
    case CatalogKind.Pattern:
      return NodeTitleResolver.getProcessorTitle(name, catalogKind, componentName);
    case CatalogKind.TestAction:
    case CatalogKind.TestActionGroup:
    case CatalogKind.TestContainer:
    case CatalogKind.TestEndpoint:
    case CatalogKind.TestFunction:
    case CatalogKind.TestValidationMatcher:
      return NodeTitleResolver.getTestActionTitle(name, catalogKind, componentName);
    default:
      return undefined;
  }
}

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
  const titleRequest = resolveTitle(catalogKind, name, componentName);

  if (titleRequest) {
    const title = await titleRequest;
    return title || name;
  }

  return name;
}
