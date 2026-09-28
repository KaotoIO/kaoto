import { FileTypes, FileTypesResponse } from '../../models';
import { CamelCatalogIndex, ComponentsCatalog } from '../../models/camel/camel-catalog-index';
import { CatalogKind } from '../../models/catalog-kind';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { DynamicCatalog } from '../dynamic-catalog';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import {
  CamelComponentsProvider,
  CamelFunctionProvider,
  CamelLanguageProvider,
  CamelProcessorsProvider,
} from '../providers/camel-components.provider';
import { CamelKameletsProvider } from '../providers/camel-kamelets.provider';

export async function fetchCamelCatalog(options: {
  catalogIndex: CamelCatalogIndex;
  relativeBasePath: string;
  getResourcesContentByType?: (filetype: FileTypes) => Promise<FileTypesResponse[]>;
}): Promise<void> {
  const { catalogIndex, relativeBasePath, getResourcesContentByType } = options;

  /** Camel Component list */
  const camelComponentsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Component]>(
    `${relativeBasePath}/${catalogIndex.catalogs.components.file}`,
  );
  /** Full list of Camel Models, used as lookup for processors definitions */
  const camelModelsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Processor]>(
    `${relativeBasePath}/${catalogIndex.catalogs.models.file}`,
  );
  /** Short list of patterns (EIPs) to fill the Catalog, as opposed of the CatalogKind.Processor which have all definitions */
  const camelPatternsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Pattern]>(
    `${relativeBasePath}/${catalogIndex.catalogs.patterns.file}`,
  );
  /** Short list of entities to fill the Catalog, as opposed of the CatalogKind.Processor which have all definitions */
  const camelEntitiesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Entity]>(
    `${relativeBasePath}/${catalogIndex.catalogs.entities.file}`,
  );
  /** Camel Languages list */
  const camelLanguagesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Language]>(
    `${relativeBasePath}/${catalogIndex.catalogs.languages.file}`,
  );
  /** Camel Kamelets definitions list (CRDs) */
  const kameletsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Kamelet]>(
    `${relativeBasePath}/${catalogIndex.catalogs.kamelets.file}`,
  );
  /** Camel Kamelets boundaries definitions list (CRDs) */
  const kameletBoundariesFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Kamelet]>(
    `${relativeBasePath}/${catalogIndex.catalogs.kameletBoundaries.file}`,
  );
  /** Functions catalog */
  const functionsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.Function]>(
    `${relativeBasePath}/${catalogIndex.catalogs.functions.file}`,
  );

  const [
    camelComponents,
    camelModels,
    camelPatterns,
    camelEntities,
    camelLanguages,
    kamelets,
    kameletBoundaries,
    functions,
  ] = await Promise.all([
    camelComponentsFiles,
    camelModelsFiles,
    camelPatternsFiles,
    camelEntitiesFiles,
    camelLanguagesFiles,
    kameletsFiles,
    kameletBoundariesFiles,
    functionsFiles,
  ]);

  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Component,
    new DynamicCatalog(new CamelComponentsProvider(camelComponents.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Processor,
    new DynamicCatalog(new CamelProcessorsProvider(camelModels.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Pattern,
    new DynamicCatalog(new CamelProcessorsProvider(camelPatterns.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Entity,
    new DynamicCatalog(new CamelProcessorsProvider(camelEntities.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Language,
    new DynamicCatalog(new CamelLanguageProvider(camelLanguages.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Kamelet,
    new DynamicCatalog(
      new CamelKameletsProvider({ ...kameletBoundaries.body, ...kamelets.body }, getResourcesContentByType),
    ),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Function,
    new DynamicCatalog(new CamelFunctionProvider(functions.body)),
  );
}
