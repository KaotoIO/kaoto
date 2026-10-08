/**
 * Vitest setup file (see vitest.config.mts): with `isolate: false` the test files of a worker share one module graph,
 * so the process-wide application state a fresh module graph would start with is reset after every file.
 */
import { afterAll } from 'vitest';

import { DynamicCatalogRegistry } from '../dynamic-catalog/dynamic-catalog-registry';
import { XPathFunctionCatalogService } from '../services/xpath/catalog/xpath-function-catalog.service';
import { useDocumentTreeStore } from '../store/document-tree.store';
import { useSchemasStore } from '../store/schemas.store';
import { useSourceCodeStore } from '../store/sourcecode.store';

afterAll(() => {
  localStorage.clear();
  sessionStorage.clear();
  DynamicCatalogRegistry.get().clearRegistry();
  XPathFunctionCatalogService.clear();
  useDocumentTreeStore.setState(useDocumentTreeStore.getInitialState(), true);
  useSchemasStore.setState(useSchemasStore.getInitialState(), true);
  useSourceCodeStore.setState(useSourceCodeStore.getInitialState(), true);
  useSourceCodeStore.temporal.getState().clear();
});
