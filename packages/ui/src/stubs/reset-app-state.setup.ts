/**
 * Vitest setup file (see vitest.config.mts): with `isolate: false` the test files of a worker share one module graph,
 * so the process-wide application state a fresh module graph would start with is reset after every file.
 *
 * The zustand stores are reset to their initial state object rather than through their actions: `set()` copies the
 * current state, including any method a test replaced with a spy, into a new object that `vi.restoreAllMocks()`
 * doesn't know about.
 */
import { afterAll } from 'vitest';

import { DynamicCatalogRegistry } from '../dynamic-catalog/dynamic-catalog-registry';
import { sourceSchemaConfig } from '../models/camel/source-schema-config';
import { TreeUIService } from '../services/visualization/tree-ui.service';
import { XPathFunctionCatalogService } from '../services/xpath/catalog/xpath-function-catalog.service';
import { useDocumentTreeStore } from '../store/document-tree.store';
import { useSchemasStore } from '../store/schemas.store';
import { useSourceCodeStore } from '../store/sourcecode.store';

type PlainData = Record<string, unknown> | unknown[];

/**
 * The fixtures exported by the stub modules are shared by every test file of a worker, and tests (or the code under
 * test, e.g. `new CamelRouteResource([camelRouteJson])`) change them in place. Their plain-data exports are restored
 * after every file from a copy taken when they were first loaded.
 */
const fixtureModules = import.meta.glob<Record<string, unknown>>(
  [
    './**/*.ts',
    '!./**/*.test.ts',
    '!./*.setup.ts',
    '!./index.ts',
    '!./create-mock-entities-context.ts',
    '!./mock-random-values.ts',
    '!./read-file-as-string.ts',
    '!./route-visualization-controller.ts',
    '!./test-load-catalog.ts',
  ],
  { eager: true },
);

const isPlainData = (value: unknown): boolean => {
  if (typeof value === 'function') return false;
  if (value === null || typeof value !== 'object') return true;
  if (Array.isArray(value)) return value.every(isPlainData);

  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null) && Object.values(value).every(isPlainData);
};

/* Kept on globalThis: setup files run again for every test file, the fixture modules don't */
const store = globalThis as typeof globalThis & { __kaotoPristineFixtures?: Map<PlainData, PlainData> };
const pristineFixtures = (store.__kaotoPristineFixtures ??= new Map<PlainData, PlainData>());

for (const fixtureModule of Object.values(fixtureModules)) {
  for (const value of Object.values(fixtureModule)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !pristineFixtures.has(value as PlainData) &&
      isPlainData(value)
    ) {
      pristineFixtures.set(value as PlainData, structuredClone(value as PlainData));
    }
  }
}

const restoreFixture = (fixture: PlainData, pristine: PlainData) => {
  const copy = structuredClone(pristine);
  if (Array.isArray(fixture) && Array.isArray(copy)) {
    fixture.splice(0, fixture.length, ...copy);
    return;
  }

  for (const key of Object.keys(fixture)) {
    delete (fixture as Record<string, unknown>)[key];
  }
  Object.assign(fixture, copy);
};

afterAll(() => {
  DynamicCatalogRegistry.get().clearRegistry();
  XPathFunctionCatalogService.clear();
  TreeUIService.clear();
  for (const schemaConfig of Object.values(sourceSchemaConfig.config)) {
    schemaConfig.schema = undefined;
  }
  useDocumentTreeStore.setState(useDocumentTreeStore.getInitialState(), true);
  useSchemasStore.setState(useSchemasStore.getInitialState(), true);
  useSourceCodeStore.setState(useSourceCodeStore.getInitialState(), true);
  useSourceCodeStore.temporal.setState(useSourceCodeStore.temporal.getInitialState(), true);

  pristineFixtures.forEach((pristine, fixture) => {
    restoreFixture(fixture, pristine);
  });
});
