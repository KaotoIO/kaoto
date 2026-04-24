import { DynamicCatalogRegistry } from '../dynamic-catalog/dynamic-catalog-registry';
import { ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../models';
import { CatalogKind } from '../models/catalog-kind';
import { ICitrusComponentDefinition } from '../models/citrus/citrus-catalog';

/**
 * Service for resolving tooltip descriptions from various catalogs.
 * This follows the same pattern as NodeIconResolver but for tooltip content.
 */
export class NodeTooltipResolver {
  /**
   * Get tooltip for a Camel component
   */
  static async getComponentTooltip(componentName: string): Promise<string> {
    const tooltip = await this.fetchTooltipFromCatalog(
      CatalogKind.Component,
      componentName,
      (def: ICamelComponentDefinition) => def.component.description,
    );
    return tooltip ?? componentName;
  }

  /**
   * Get tooltip for a Camel processor/pattern
   */
  static async getProcessorTooltip(processorName: string): Promise<string> {
    // Try processor catalog first
    let tooltip = await this.fetchTooltipFromCatalog(
      CatalogKind.Processor,
      processorName,
      (def: ICamelProcessorDefinition) => def.model.description,
    );

    // Fallback to pattern catalog
    if (!tooltip) {
      tooltip = await this.fetchTooltipFromCatalog(
        CatalogKind.Pattern,
        processorName,
        (def: ICamelProcessorDefinition) => def.model.description,
      );
    }

    return tooltip ?? processorName;
  }

  /**
   * Get tooltip for a Kamelet
   */
  static async getKameletTooltip(kameletName: string): Promise<string> {
    // Remove 'kamelet:' prefix if present
    const cleanName = kameletName.replace('kamelet:', '');
    const tooltip = await this.fetchTooltipFromCatalog(
      CatalogKind.Kamelet,
      cleanName,
      (def: IKameletDefinition) => def.spec.definition.description,
    );
    return tooltip ?? kameletName;
  }

  /**
   * Get tooltip for an entity (route, rest, etc.)
   */
  static async getEntityTooltip(entityName: string): Promise<string> {
    const tooltip = await this.fetchTooltipFromCatalog(
      CatalogKind.Entity,
      entityName,
      (def: ICamelProcessorDefinition) => def.model.description,
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

    const catalogKinds = [requestedKind, ...allTestKinds.filter((kind) => kind !== requestedKind)];

    for (const kind of catalogKinds) {
      const tooltip = await this.fetchTooltipFromCatalog(
        kind,
        actionName,
        (def: ICitrusComponentDefinition) => def.description,
      );
      if (tooltip) {
        return tooltip;
      }
    }

    return actionName;
  }

  /**
   * Common helper to fetch tooltip from catalog with proper error handling.
   */
  private static async fetchTooltipFromCatalog(
    catalogKind: CatalogKind,
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptionExtractor: (definition: any) => string | undefined,
  ): Promise<string | undefined> {
    try {
      const definition = await DynamicCatalogRegistry.get().getEntity(catalogKind, name);
      if (definition) {
        return descriptionExtractor(definition) ?? undefined;
      }
    } catch (error) {
      console.warn('Failed to fetch description tooltip', error);
    }
    return undefined;
  }
}
