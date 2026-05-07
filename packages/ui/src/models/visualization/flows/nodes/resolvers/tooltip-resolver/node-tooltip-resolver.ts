import { CatalogKind } from '../../../../../catalog-kind';
import { CatalogResolverFactory } from '../catalog-resolver.factory';

/**
 * Service for resolving tooltip descriptions from various catalogs.
 * Uses the CatalogResolverFactory to eliminate code duplication.
 */
export class NodeTooltipResolver {
  /**
   * Get tooltip for a Camel component
   */
  static async getComponentTooltip(componentName: string): Promise<string> {
    const tooltip = await CatalogResolverFactory.resolveProperty(
      CatalogKind.Component,
      componentName,
      (def) => def?.component?.description,
    );
    return tooltip ?? componentName;
  }

  /**
   * Get tooltip for a Camel processor/pattern
   */
  static async getProcessorTooltip(processorName: string): Promise<string> {
    // Try processor catalog first, fallback to pattern catalog
    const tooltip = await CatalogResolverFactory.resolvePropertyWithFallbacks(
      [CatalogKind.Processor, CatalogKind.Pattern],
      processorName,
      (def) => def?.model?.description,
    );
    return tooltip ?? processorName;
  }

  /**
   * Get tooltip for a Kamelet
   */
  static async getKameletTooltip(kameletName: string): Promise<string> {
    // Remove 'kamelet:' prefix if present
    const cleanName = kameletName.replace('kamelet:', '');
    const tooltip = await CatalogResolverFactory.resolveProperty(
      CatalogKind.Kamelet,
      cleanName,
      (def) => def?.spec?.definition?.description,
    );
    return tooltip ?? kameletName;
  }

  /**
   * Get tooltip for an entity (route, rest, etc.)
   */
  static async getEntityTooltip(entityName: string): Promise<string> {
    const tooltip = await CatalogResolverFactory.resolveProperty(
      CatalogKind.Entity,
      entityName,
      (def) => def?.model?.description,
    );
    return tooltip ?? entityName;
  }

  /**
   * Get tooltip for a Citrus test action
   */
  static async getTestActionTooltip(actionName: string, requestedKind: CatalogKind): Promise<string> {
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

    const tooltip = await CatalogResolverFactory.resolvePropertyWithFallbacks(
      catalogKinds,
      actionName,
      (def) => def?.description,
    );
    return tooltip ?? actionName;
  }
}
