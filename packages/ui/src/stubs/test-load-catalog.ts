import { CatalogLibrary, CatalogLibraryEntry, KaotoFunction, KaotoFunctionArgument } from '@kaoto/camel-catalog/types';
import { CatalogKind } from '@kaoto/editor-api';

import { DynamicCatalog } from '../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../dynamic-catalog/dynamic-catalog-registry';
import {
  CamelComponentsProvider,
  CamelFunctionProvider,
  CamelLanguageProvider,
  CamelProcessorsProvider,
} from '../dynamic-catalog/providers/camel-components.provider';
import { CamelKameletsProvider } from '../dynamic-catalog/providers/camel-kamelets.provider';
import {
  CitrusTestActionsProvider,
  CitrusTestContainersProvider,
  CitrusTestEndpointsProvider,
} from '../dynamic-catalog/providers/citrus-components.provider';
import {
  CamelCatalogIndex,
  CitrusCatalogIndex,
  ICamelComponentDefinition,
  ICamelLanguageDefinition,
  ICamelProcessorDefinition,
  ICitrusComponentDefinition,
  IKameletDefinition,
} from '../models';

export const getFirstCatalogMap = async (catalogLibrary: CatalogLibrary) => {
  const [firstCatalogLibraryEntry] = catalogLibrary.definitions;

  return await testLoadCatalog(firstCatalogLibraryEntry as CatalogLibraryEntry);
};

export const testLoadCatalog = async (catalogLibraryEntry: CatalogLibraryEntry) => {
  const catalogDefinition: CamelCatalogIndex = (await import(`@kaoto/camel-catalog/${catalogLibraryEntry.fileName}`))
    .default;

  const catalogPath = `@kaoto/camel-catalog/${catalogLibraryEntry.fileName.substring(0, catalogLibraryEntry.fileName.lastIndexOf('/') + 1)}`;

  const componentCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.components.file}`);
  const componentCatalogMap: Record<string, ICamelComponentDefinition> =
    componentCatalogMapImport.default || componentCatalogMapImport;

  const modelCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.models.file}`);
  const modelCatalogMap: Record<string, ICamelProcessorDefinition> =
    modelCatalogMapImport.default || modelCatalogMapImport;

  const patternCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.patterns.file}`);
  const patternCatalogMap: Record<string, ICamelProcessorDefinition> =
    patternCatalogMapImport.default || patternCatalogMapImport;

  const kameletsCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.kamelets.file}`);
  const kameletsCatalogMap: Record<string, IKameletDefinition> =
    kameletsCatalogMapImport.default || kameletsCatalogMapImport;

  const kameletsBoundariesCatalogImport = await import(
    `${catalogPath}${catalogDefinition.catalogs.kameletBoundaries.file}`
  );
  const kameletsBoundariesCatalog: Record<string, IKameletDefinition> =
    kameletsBoundariesCatalogImport.default || kameletsBoundariesCatalogImport;

  const languageCatalogImport = await import(`${catalogPath}${catalogDefinition.catalogs.languages.file}`);
  const languageCatalog: Record<string, ICamelLanguageDefinition> =
    languageCatalogImport.default || languageCatalogImport;

  const entitiesCatalogImport = await import(`${catalogPath}${catalogDefinition.catalogs.entities.file}`);
  const entitiesCatalog: Record<string, ICamelProcessorDefinition> =
    entitiesCatalogImport.default || entitiesCatalogImport;

  const functionsCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.functions.file}`);
  const functionsCatalogMap: Record<
    string,
    Record<string, KaotoFunction<KaotoFunctionArgument>>
  > = functionsCatalogMapImport.default || functionsCatalogMapImport;

  // The imported JSON modules are cached and shared by every test file of a worker (`isolate: false`),
  // so hand out a copy: some tests adjust the catalogs to their needs
  return structuredClone({
    catalogDefinition,
    catalogPath,
    componentCatalogMap,
    modelCatalogMap,
    patternCatalogMap,
    kameletsCatalogMap,
    kameletsBoundariesCatalog,
    languageCatalog,
    entitiesCatalog,
    functionsCatalogMap,
  });
};

export const citrusCatalogSelector = (catalogLibrary: CatalogLibrary) => {
  return catalogLibrary.definitions.find((catalog) => catalog.runtime === 'Citrus');
};

export const getFirstCitrusCatalogMap = async (catalogLibrary: CatalogLibrary) => {
  const citrusCatalogLibraryEntry = citrusCatalogSelector(catalogLibrary);
  if (!citrusCatalogLibraryEntry) {
    throw new Error('No Citrus catalog found in catalog library');
  }

  return await testLoadCitrusCatalog(citrusCatalogLibraryEntry as CatalogLibraryEntry);
};

export const testLoadCitrusCatalog = async (catalogLibraryEntry: CatalogLibraryEntry) => {
  const catalogDefinition: CitrusCatalogIndex = (await import(`@kaoto/camel-catalog/${catalogLibraryEntry.fileName}`))
    .default;

  const catalogPath = `@kaoto/camel-catalog/${catalogLibraryEntry.fileName.substring(0, catalogLibraryEntry.fileName.lastIndexOf('/') + 1)}`;

  const actionsCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.actions.file}`);
  const actionsCatalogMap: Record<string, ICitrusComponentDefinition> =
    actionsCatalogMapImport.default || actionsCatalogMapImport;

  const containersCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.containers.file}`);
  const containersCatalogMap: Record<string, ICitrusComponentDefinition> =
    containersCatalogMapImport.default || containersCatalogMapImport;

  const endpointsCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.endpoints.file}`);
  const endpointsCatalogMap: Record<string, ICitrusComponentDefinition> =
    endpointsCatalogMapImport.default || endpointsCatalogMapImport;

  // The imported JSON modules are cached and shared by every test file of a worker (`isolate: false`),
  // so hand out a copy: some tests adjust the catalogs to their needs
  return structuredClone({
    catalogDefinition,
    catalogPath,
    actionsCatalogMap,
    containersCatalogMap,
    endpointsCatalogMap,
  });
};

/**
 * Helper to populate DynamicCatalogRegistry with all catalog types for testing.
 * Use this in beforeAll/beforeEach to avoid duplicating catalog setup across tests.
 *
 * @example
 * beforeAll(async () => {
 *   const catalogsMap = await getFirstCatalogMap(catalogLibrary);
 *   setupDynamicCatalogRegistry(catalogsMap);
 * });
 */
export const setupDynamicCatalogRegistry = (catalogsMap: Awaited<ReturnType<typeof testLoadCatalog>>) => {
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Component,
    new DynamicCatalog(new CamelComponentsProvider(catalogsMap.componentCatalogMap)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Processor,
    new DynamicCatalog(new CamelProcessorsProvider(catalogsMap.modelCatalogMap)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Pattern,
    new DynamicCatalog(new CamelProcessorsProvider(catalogsMap.patternCatalogMap)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Entity,
    new DynamicCatalog(new CamelProcessorsProvider(catalogsMap.entitiesCatalog)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Kamelet,
    new DynamicCatalog(new CamelKameletsProvider(catalogsMap.kameletsCatalogMap)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Language,
    new DynamicCatalog(new CamelLanguageProvider(catalogsMap.languageCatalog)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Function,
    new DynamicCatalog(new CamelFunctionProvider(catalogsMap.functionsCatalogMap)),
  );
};

/**
 * Helper to populate DynamicCatalogRegistry with the Citrus TestEndpoint catalog for testing.
 * Use this in beforeAll/beforeEach to avoid duplicating catalog setup across tests.
 *
 * @example
 * beforeAll(async () => {
 *   const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary);
 *   setupCitrusDynamicCatalogRegistry(catalogsMap);
 * });
 */
export const setupCitrusDynamicCatalogRegistry = (catalogsMap: Awaited<ReturnType<typeof testLoadCitrusCatalog>>) => {
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.TestEndpoint,
    new DynamicCatalog(new CitrusTestEndpointsProvider(catalogsMap.endpointsCatalogMap)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.TestAction,
    new DynamicCatalog(new CitrusTestActionsProvider(catalogsMap.actionsCatalogMap)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.TestContainer,
    new DynamicCatalog(new CitrusTestContainersProvider(catalogsMap.containersCatalogMap)),
  );
};
