import { CatalogDefinition, CatalogDefinitionEntry } from '@kaoto/camel-catalog/types';

/**
 * Key under which the Bob root Custom Mode schema (`custom-mode-yaml`) is declared in the
 * Bob catalog index `schemas` section.
 */
export const BOB_CUSTOM_MODE_SCHEMA_KEY = 'custom-mode-yaml';

/**
 * Name under which the Bob root Custom Mode schema is registered in the catalog
 * (`CatalogKind.Entity`), mirroring how Citrus exposes `TestConfiguration`.
 */
export const BOB_CUSTOM_MODE_ROOT_ENTITY_NAME = 'CustomModeConfiguration';

/**
 * Bob catalog index interface that extends the base CatalogDefinition.
 */
export interface BobCatalogIndex extends Omit<CatalogDefinition, 'catalogs'> {
  catalogs: {
    modes: CatalogDefinitionEntry;
    tools: CatalogDefinitionEntry;
    components: CatalogDefinitionEntry;
  };
}
