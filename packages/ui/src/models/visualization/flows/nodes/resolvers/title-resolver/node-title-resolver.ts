import { CatalogKind } from '../../../../../catalog-kind';
import { CatalogResolverFactory } from '../catalog-resolver.factory';

/**
 * Service for resolving node titles from the catalog.
 * Async alternative to CamelComponentSchemaService.getNodeTitle()
 */
export class NodeTitleResolver {
  /**
   * Resolves the title for a Camel component.
   */
  static async getComponentTitle(name: string): Promise<string> {
    const title = await CatalogResolverFactory.resolveProperty(
      CatalogKind.Component,
      name,
      (def) => def?.component?.title,
    );
    return title ?? name;
  }

  /**
   * Resolves the title for a Kamelet.
   */
  static async getKameletTitle(name: string): Promise<string> {
    // Remove 'kamelet:' prefix if present
    const cleanName = name.replace('kamelet:', '');
    const title = await CatalogResolverFactory.resolveProperty(
      CatalogKind.Kamelet,
      cleanName,
      (def) => def?.spec?.definition?.title,
    );
    return title ?? name;
  }

  /**
   * Resolves the title for a processor.
   * If a component name is provided, tries to get the component title first.
   */
  static async getProcessorTitle(
    processorName: string,
    _catalogKind: CatalogKind,
    componentName?: string,
  ): Promise<string> {
    // If there's a component name, get the component/kamelet title
    if (componentName) {
      if (componentName.startsWith('kamelet:')) {
        const kameletName = componentName.replace('kamelet:', '');
        return this.getKameletTitle(kameletName);
      }
      return this.getComponentTitle(componentName);
    }

    // Try processor catalog, fallback to pattern catalog
    const title = await CatalogResolverFactory.resolvePropertyWithFallbacks(
      [CatalogKind.Processor, CatalogKind.Pattern],
      processorName,
      (def) => def?.model?.title,
    );
    return title ?? processorName;
  }

  /**
   * Resolves the title for an entity (route, errorHandler, etc.).
   */
  static async getEntityTitle(name: string): Promise<string> {
    const title = await CatalogResolverFactory.resolveProperty(CatalogKind.Entity, name, (def) => def?.model?.title);

    // If catalog has a title, use it
    if (title) {
      return title;
    }

    // Otherwise, format camelCase to spaced title
    // : "routeConfiguration" -> "Route Configuration"
    const formatted = name
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();

    return formatted;
  }

  /**
   * Resolves the title for a test action.
   * Searches across all test catalog kinds, prioritizing the requested kind.
   */
  static async getTestActionTitle(name: string, requestedKind: CatalogKind, _componentName?: string): Promise<string> {
    // All possible test catalog kinds
    const allTestKinds = [
      CatalogKind.TestAction,
      CatalogKind.TestActionGroup,
      CatalogKind.TestContainer,
      CatalogKind.TestEndpoint,
      CatalogKind.TestFunction,
      CatalogKind.TestValidationMatcher,
    ];

    // Try requested kind first, then all other test kinds
    const catalogKinds = [requestedKind, ...allTestKinds.filter((kind) => kind !== requestedKind)];

    const title = await CatalogResolverFactory.resolvePropertyWithFallbacks(catalogKinds, name, (def) => def?.title);
    return title ?? name;
  }
}
