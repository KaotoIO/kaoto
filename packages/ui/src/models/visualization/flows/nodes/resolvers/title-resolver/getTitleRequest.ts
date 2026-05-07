import { CatalogKind } from '../../../../../catalog-kind';
import { NodeTitleResolver } from './node-title-resolver';

/**
 * Mapping of catalog kinds to their respective resolver methods.
 */
const TITLE_RESOLVER_MAP: Partial<
  Record<CatalogKind, (name: string, catalogKind: CatalogKind, componentName?: string) => Promise<string>>
> = {
  [CatalogKind.Entity]: NodeTitleResolver.getEntityTitle,
  [CatalogKind.Kamelet]: NodeTitleResolver.getKameletTitle,
  [CatalogKind.Component]: NodeTitleResolver.getComponentTitle,
  [CatalogKind.Processor]: NodeTitleResolver.getProcessorTitle,
  [CatalogKind.Pattern]: NodeTitleResolver.getProcessorTitle,
  [CatalogKind.TestAction]: NodeTitleResolver.getTestActionTitle,
  [CatalogKind.TestActionGroup]: NodeTitleResolver.getTestActionTitle,
  [CatalogKind.TestContainer]: NodeTitleResolver.getTestActionTitle,
  [CatalogKind.TestEndpoint]: NodeTitleResolver.getTestActionTitle,
  [CatalogKind.TestFunction]: NodeTitleResolver.getTestActionTitle,
  [CatalogKind.TestValidationMatcher]: NodeTitleResolver.getTestActionTitle,
};

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
  const resolver = TITLE_RESOLVER_MAP[catalogKind];

  if (resolver) {
    const title = await resolver(name, catalogKind, componentName);
    return title || name;
  }

  return name;
}
