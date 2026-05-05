import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../../catalog-kind';

/**
 * Service for resolving node titles from the catalog.
 * Async alternative to CamelComponentSchemaService.getNodeTitle()
 */
export class NodeTitleResolver {
  /**
   * Resolves the title for a Camel component.
   */
  static async getComponentTitle(name: string): Promise<string> {
    const component = await DynamicCatalogRegistry.get().getEntity<CatalogKind.Component>(CatalogKind.Component, name);
    return component?.component.title ?? name;
  }

  /**
   * Resolves the title for a Kamelet.
   */
  static async getKameletTitle(name: string): Promise<string> {
    // Remove 'kamelet:' prefix if present
    const cleanName = name.replace('kamelet:', '');
    const kamelet = await DynamicCatalogRegistry.get().getEntity<CatalogKind.Kamelet>(CatalogKind.Kamelet, cleanName);
    return kamelet?.spec.definition.title ?? name;
  }

  /**
   * Resolves the title for a processor.
   * If a component name is provided, tries to get the component title first.
   */
  static async getProcessorTitle(processorName: string, componentName?: string): Promise<string> {
    // If there's a component name, get the component/kamelet title
    if (componentName) {
      if (componentName.startsWith('kamelet:')) {
        const kameletName = componentName.replace('kamelet:', '');
        return this.getKameletTitle(kameletName);
      }
      return this.getComponentTitle(componentName);
    }

    // Otherwise get processor title
    const processor = await DynamicCatalogRegistry.get().getEntity<CatalogKind.Processor>(
      CatalogKind.Processor,
      processorName,
    );
    return processor?.model.title ?? processorName;
  }

  /**
   * Resolves the title for an entity (route, errorHandler, etc.).
   */
  static async getEntityTitle(name: string): Promise<string> {
    const entity = await DynamicCatalogRegistry.get().getEntity<CatalogKind.Entity>(CatalogKind.Entity, name);

    // If catalog has a title, use it
    if (entity?.model?.title) {
      return entity.model.title;
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
   */
  static async getTestActionTitle(name: string): Promise<string> {
    const testAction = await DynamicCatalogRegistry.get().getEntity<CatalogKind.TestAction>(
      CatalogKind.TestAction,
      name,
    );
    return testAction?.title ?? name;
  }
}
