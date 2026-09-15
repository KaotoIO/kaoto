import { CatalogKind } from '../catalog-kind';
import { KaotoSchemaDefinition } from '../kaoto-schema';

/**
 * Interface representing a Citrus component definition in the catalog.
 *
 * Citrus components represent test actions, templates, containers, endpoints, functions, or validation matchers.
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
    | CatalogKind.TestActionTemplate
    | CatalogKind.TestContainer
    | CatalogKind.TestEndpoint
    | CatalogKind.TestFunction
    | CatalogKind.TestValidationMatcher;

  /** The current version of the component */
  version?: string;

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

/** A reusable Citrus template exposed as an applyTemplate action in the catalog. */
export interface ICitrusTestActionTemplateDefinition extends ICitrusComponentDefinition {
  kind: CatalogKind.TestActionTemplate;

  /** Ordered input parameters and their initial values for each template invocation. */
  parameters?: Array<{ name: string; value: string | number | boolean | null }>;
}
