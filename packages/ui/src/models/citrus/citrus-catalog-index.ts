import { CatalogDefinition, CatalogDefinitionEntry } from '@kaoto/camel-catalog/types';

/**
 * Key under which the Citrus root test schema (`citrus-yaml`) is declared in the
 * Citrus catalog index `schemas` section.
 */
export const CITRUS_YAML_SCHEMA_KEY = 'citrus-yaml';

/**
 * Name under which the Citrus root test schema is registered in the catalog
 * (`CatalogKind.Entity`), mirroring how Kamelets expose `KameletConfiguration`.
 * This lets the Citrus Test entity source its root schema from the catalog,
 * the same path used by Camel Routes and Kamelets.
 */
export const CITRUS_TEST_ROOT_ENTITY_NAME = 'TestConfiguration';

/**
 * Citrus catalog index interface that extends the base CatalogDefinition.
 * Defines the structure of the Citrus catalog with specific catalog types for test automation.
 *
 * This interface replaces the generic 'catalogs' property with Citrus-specific catalog entries:
 * - actions: Test actions that can be executed in a test
 * - containers: Test containers that can hold nested actions (e.g., iterate, sequential)
 * - endpoints: Communication endpoints for sending/receiving messages
 * - functions: Functions available for use in test expressions
 * - validationMatcher: Matchers for validating message content
 */
export interface CitrusCatalogIndex extends Omit<CatalogDefinition, 'catalogs'> {
  catalogs: {
    actions: CatalogDefinitionEntry;
    containers: CatalogDefinitionEntry;
    endpoints: CatalogDefinitionEntry;
    functions: CatalogDefinitionEntry;
    validationMatcher: CatalogDefinitionEntry;
  };
}
