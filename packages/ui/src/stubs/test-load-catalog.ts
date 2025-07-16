import { CatalogLibrary, CatalogLibraryEntry, KaotoFunction } from '@kaoto/camel-catalog/types';
import {
  CamelCatalogIndex,
  ICamelComponentDefinition,
  ICamelDataformatDefinition,
  ICamelLanguageDefinition,
  ICamelLoadBalancerDefinition,
  ICamelProcessorDefinition,
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

  const componentCatalogMap: Record<string, ICamelComponentDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.components.file}`
  );
  delete componentCatalogMap.default;

  const modelCatalogMap: Record<string, ICamelProcessorDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.models.file}`
  );
  delete modelCatalogMap.default;

  const patternCatalogMap: Record<string, ICamelProcessorDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.patterns.file}`
  );
  delete patternCatalogMap.default;

  const kameletsCatalogMap: Record<string, IKameletDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.kamelets.file}`
  );
  delete kameletsCatalogMap.default;

  const kameletsBoundariesCatalog: Record<string, IKameletDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.kameletBoundaries.file}`
  );
  delete kameletsBoundariesCatalog.default;

  const languageCatalog: Record<string, ICamelLanguageDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.languages.file}`
  );
  delete languageCatalog.default;

  const dataformatCatalog: Record<string, ICamelDataformatDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.dataformats.file}`
  );
  delete dataformatCatalog.default;

  const loadbalancerCatalog: Record<string, ICamelLoadBalancerDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.loadbalancers.file}`
  );
  delete loadbalancerCatalog.default;

  const entitiesCatalog: Record<string, ICamelProcessorDefinition> = await import(
    `${catalogPath}${catalogDefinition.catalogs.entities.file}`
  );
  delete entitiesCatalog.default;

  const functionsCatalogMap: Record<string, Record<string, KaotoFunction>> = await import(
    `${catalogPath}${catalogDefinition.catalogs.functions.file}`
  );
  delete functionsCatalogMap.default;

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
