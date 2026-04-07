import { CatalogDefinition, CatalogDefinitionEntry } from '@kaoto/camel-catalog/types';

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
