import { CamelCatalogService } from '../../models';
import { ComponentsCatalog } from '../../models/camel/camel-catalog-index';
import { CatalogKind } from '../../models/catalog-kind';
import { CitrusCatalogIndex } from '../../models/citrus/citrus-catalog-index';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { DynamicCatalog } from '../dynamic-catalog';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import {
  CitrusTestActionsProvider,
  CitrusTestContainersProvider,
  CitrusTestEndpointsProvider,
  CitrusTestFunctionsProvider,
  CitrusTestValidationMatcherProvider,
} from '../providers/citrus-components.provider';

export async function fetchCitrusCatalog(options: {
  catalogIndex: CitrusCatalogIndex;
  relativeBasePath: string;
}): Promise<void> {
  const { catalogIndex, relativeBasePath } = options;

  /** Citrus test actions */
  const actionsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestAction]>(
    `${relativeBasePath}/${catalogIndex.catalogs.actions.file}`,
  );
  /** Citrus test containers */
  const containerFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestContainer]>(
    `${relativeBasePath}/${catalogIndex.catalogs.containers.file}`,
  );
  /** Citrus test endpoints */
  const endpointFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestEndpoint]>(
    `${relativeBasePath}/${catalogIndex.catalogs.endpoints.file}`,
  );
  /** Citrus test functions */
  const functionFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestFunction]>(
    `${relativeBasePath}/${catalogIndex.catalogs.functions.file}`,
  );
  /** Citrus test validation matcher */
  const validationMatcherFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.TestValidationMatcher]>(
    `${relativeBasePath}/${catalogIndex.catalogs.validationMatcher.file}`,
  );

  const [testActions, testContainers, testEndpoints, testFunctions, testValidationMatcher] = await Promise.all([
    actionsFiles,
    containerFiles,
    endpointFiles,
    functionFiles,
    validationMatcherFiles,
  ]);

  CamelCatalogService.setCatalogKey(CatalogKind.TestAction, testActions.body);
  CamelCatalogService.setCatalogKey(CatalogKind.TestContainer, testContainers.body);
  CamelCatalogService.setCatalogKey(CatalogKind.TestEndpoint, testEndpoints.body);
  CamelCatalogService.setCatalogKey(CatalogKind.TestFunction, testFunctions.body);
  CamelCatalogService.setCatalogKey(CatalogKind.TestValidationMatcher, testValidationMatcher.body);

  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.TestAction,
    new DynamicCatalog(new CitrusTestActionsProvider(testActions.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.TestContainer,
    new DynamicCatalog(new CitrusTestContainersProvider(testContainers.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.TestEndpoint,
    new DynamicCatalog(new CitrusTestEndpointsProvider(testEndpoints.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.TestFunction,
    new DynamicCatalog(new CitrusTestFunctionsProvider(testFunctions.body)),
  );
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.TestValidationMatcher,
    new DynamicCatalog(new CitrusTestValidationMatcherProvider(testValidationMatcher.body)),
  );
}
