import { CatalogKind } from './catalog-kind';
import { KaotoSchemaDefinition } from './kaoto-schema';

export interface ICitrusComponentDefinition {
  kind:
    | CatalogKind.TestActionGroup
    | CatalogKind.TestAction
    | CatalogKind.TestContainer
    | CatalogKind.TestEndpoint
    | CatalogKind.TestFunction
    | CatalogKind.TestValidationMatcher;
  name: string;
  group?: string;
  title?: string;
  description: string;
  propertiesSchema?: KaotoSchemaDefinition['schema'];
}
