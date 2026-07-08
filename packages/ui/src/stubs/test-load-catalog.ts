import { CatalogLibrary, CatalogLibraryEntry, KaotoFunction } from '@kaoto/camel-catalog/types';

import { DynamicCatalog } from '../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../dynamic-catalog/dynamic-catalog-registry';
import {
  CamelComponentsProvider,
  CamelDataformatProvider,
  CamelFunctionProvider,
  CamelLanguageProvider,
  CamelLoadbalancerProvider,
  CamelProcessorsProvider,
} from '../dynamic-catalog/providers/camel-components.provider';
import { CamelKameletsProvider } from '../dynamic-catalog/providers/camel-kamelets.provider';
import { CitrusTestEndpointsProvider } from '../dynamic-catalog/providers/citrus-components.provider';
import {
  CamelCatalogIndex,
  CitrusCatalogIndex,
  ICamelComponentDefinition,
  ICamelDataformatDefinition,
  ICamelLanguageDefinition,
  ICamelLoadBalancerDefinition,
  ICamelProcessorDefinition,
  ICitrusComponentDefinition,
  IKameletDefinition,
} from '../models';
import { CatalogKind } from '../models/catalog-kind';

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
  if (componentCatalogMapImport.default) {
    delete componentCatalogMapImport.default;
  }

  const modelCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.models.file}`);
  const modelCatalogMap: Record<string, ICamelProcessorDefinition> =
    modelCatalogMapImport.default || modelCatalogMapImport;
  if (modelCatalogMapImport.default) {
    delete modelCatalogMapImport.default;
  }

  const patternCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.patterns.file}`);
  const patternCatalogMap: Record<string, ICamelProcessorDefinition> =
    patternCatalogMapImport.default || patternCatalogMapImport;
  if (patternCatalogMapImport.default) {
    delete patternCatalogMapImport.default;
  }

  const kameletsCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.kamelets.file}`);
  const kameletsCatalogMap: Record<string, IKameletDefinition> =
    kameletsCatalogMapImport.default || kameletsCatalogMapImport;
  if (kameletsCatalogMapImport.default) {
    delete kameletsCatalogMapImport.default;
  }

  const kameletsBoundariesCatalogImport = await import(
    `${catalogPath}${catalogDefinition.catalogs.kameletBoundaries.file}`
  );
  const kameletsBoundariesCatalog: Record<string, IKameletDefinition> =
    kameletsBoundariesCatalogImport.default || kameletsBoundariesCatalogImport;
  if (kameletsBoundariesCatalogImport.default) {
    delete kameletsBoundariesCatalogImport.default;
  }

  const languageCatalogImport = await import(`${catalogPath}${catalogDefinition.catalogs.languages.file}`);
  const languageCatalog: Record<string, ICamelLanguageDefinition> =
    languageCatalogImport.default || languageCatalogImport;
  if (languageCatalogImport.default) {
    delete languageCatalogImport.default;
  }

  const dataformatCatalogImport = await import(`${catalogPath}${catalogDefinition.catalogs.dataformats.file}`);
  const dataformatCatalog: Record<string, ICamelDataformatDefinition> =
    dataformatCatalogImport.default || dataformatCatalogImport;
  if (dataformatCatalogImport.default) {
    delete dataformatCatalogImport.default;
  }

  const loadbalancerCatalogImport = await import(`${catalogPath}${catalogDefinition.catalogs.loadbalancers.file}`);
  const loadbalancerCatalog: Record<string, ICamelLoadBalancerDefinition> =
    loadbalancerCatalogImport.default || loadbalancerCatalogImport;
  if (loadbalancerCatalogImport.default) {
    delete loadbalancerCatalogImport.default;
  }

  const entitiesCatalogImport = await import(`${catalogPath}${catalogDefinition.catalogs.entities.file}`);
  const entitiesCatalog: Record<string, ICamelProcessorDefinition> =
    entitiesCatalogImport.default || entitiesCatalogImport;
  if (entitiesCatalogImport.default) {
    delete entitiesCatalogImport.default;
  }

  const functionsCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.functions.file}`);
  const functionsCatalogMap: Record<string, Record<string, KaotoFunction>> = functionsCatalogMapImport.default ||
  functionsCatalogMapImport;
  if (functionsCatalogMapImport.default) {
    delete functionsCatalogMapImport.default;
  }

  return {
    catalogDefinition,
    catalogPath,
    componentCatalogMap,
    modelCatalogMap,
    patternCatalogMap,
    kameletsCatalogMap,
    kameletsBoundariesCatalog,
    languageCatalog,
    dataformatCatalog,
    loadbalancerCatalog,
    entitiesCatalog,
    functionsCatalogMap,
  };
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
  if (actionsCatalogMapImport.default) {
    delete actionsCatalogMapImport.default;
  }

  const containersCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.containers.file}`);
  const containersCatalogMap: Record<string, ICitrusComponentDefinition> =
    containersCatalogMapImport.default || containersCatalogMapImport;
  if (containersCatalogMapImport.default) {
    delete containersCatalogMapImport.default;
  }

  const endpointsCatalogMapImport = await import(`${catalogPath}${catalogDefinition.catalogs.endpoints.file}`);
  const endpointsCatalogMap: Record<string, ICitrusComponentDefinition> =
    endpointsCatalogMapImport.default || endpointsCatalogMapImport;
  if (endpointsCatalogMapImport.default) {
    delete endpointsCatalogMapImport.default;
  }

  return {
    catalogDefinition,
    catalogPath,
    actionsCatalogMap,
    containersCatalogMap,
    endpointsCatalogMap,
  };
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
    CatalogKind.Dataformat,
    new DynamicCatalog(new CamelDataformatProvider(catalogsMap.dataformatCatalog)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Loadbalancer,
    new DynamicCatalog(new CamelLoadbalancerProvider(catalogsMap.loadbalancerCatalog)),
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
};
