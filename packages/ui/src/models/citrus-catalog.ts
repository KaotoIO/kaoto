import { CatalogKind } from './catalog-kind';
import { KaotoSchemaDefinition } from './kaoto-schema';

/**
 * Interface representing a Citrus component definition in the catalog.
 *
 * Citrus components represent test actions, containers, endpoints, functions, or validation matchers.
 * Each component has metadata and an optional JSON schema for its properties.
 */
export interface ICitrusComponentDefinition {
  /**
   * The catalog kind/type of this Citrus component.
   * Determines how the component is categorized and used in the visual editor.
   */
  kind:
    | CatalogKind.TestActionGroup
    | CatalogKind.TestAction
    | CatalogKind.TestContainer
    | CatalogKind.TestEndpoint
    | CatalogKind.TestFunction
    | CatalogKind.TestValidationMatcher;

  /** The unique name/identifier of the component */
  name: string;

  /** Optional group name for organizing related components (e.g. for test action groups) */
  group?: string;

  /** Optional human-readable title for display in the UI */
  title?: string;

  /** Optional description explaining the component's purpose and usage */
  description?: string;

  /** Optional JSON schema defining the component's configurable properties */
  propertiesSchema?: KaotoSchemaDefinition['schema'];
}
