import { CatalogDefinition, CatalogDefinitionEntry } from '@kaoto/camel-catalog/types';

export interface CitrusCatalogIndex extends Omit<CatalogDefinition, 'catalogs'> {
  catalogs: {
    actions: CatalogDefinitionEntry;
    containers: CatalogDefinitionEntry;
    endpoints: CatalogDefinitionEntry;
    functions: CatalogDefinitionEntry;
    validationMatcher: CatalogDefinitionEntry;
  };
}
