import { CamelCatalogService } from '../../models';
import { ComponentsCatalog } from '../../models/camel/camel-catalog-index';
import { ICamelProcessorDefinition } from '../../models/camel/camel-processors-catalog';
import { CatalogKind } from '../../models/catalog-kind';
import {
  CITRUS_TEST_ROOT_ENTITY_NAME,
  CITRUS_YAML_SCHEMA_KEY,
  CitrusCatalogIndex,
} from '../../models/citrus/citrus-catalog-index';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { DynamicCatalog } from '../dynamic-catalog';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import { CamelProcessorsProvider } from '../providers/camel-components.provider';
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
  /** Citrus root test schema (citrus-yaml), served through the catalog like other entities */
  const testRootSchemaFile = CatalogSchemaLoader.fetchFile<ICamelProcessorDefinition['propertiesSchema']>(
    `${relativeBasePath}/${catalogIndex.schemas[CITRUS_YAML_SCHEMA_KEY].file}`,
  );

  const [testActions, testContainers, testEndpoints, testFunctions, testValidationMatcher, testRootSchema] =
    await Promise.all([
      actionsFiles,
      containerFiles,
      endpointFiles,
      functionFiles,
      validationMatcherFiles,
      testRootSchemaFile,
    ]);

  /**
   * Expose the root test schema as a catalog entity (mirroring Kamelet's `KameletConfiguration`)
   * so the Citrus Test visual entity sources its root schema from the catalog, the same path used
   * by Camel Routes and Kamelets. This avoids relying on the `SchemasLoaderProvider`/`sourceSchemaConfig`
   * singleton, which is not mounted in the VS Code editor entry point.
   */
  const testRootEntity: ComponentsCatalog[CatalogKind.Entity] = {
    [CITRUS_TEST_ROOT_ENTITY_NAME]: { propertiesSchema: testRootSchema.body } as ICamelProcessorDefinition,
  };

  CamelCatalogService.setCatalogKey(CatalogKind.TestAction, testActions.body);
  CamelCatalogService.setCatalogKey(CatalogKind.TestContainer, testContainers.body);
  CamelCatalogService.setCatalogKey(CatalogKind.TestEndpoint, testEndpoints.body);
  CamelCatalogService.setCatalogKey(CatalogKind.TestFunction, testFunctions.body);
  CamelCatalogService.setCatalogKey(CatalogKind.TestValidationMatcher, testValidationMatcher.body);
  CamelCatalogService.setCatalogKey(CatalogKind.Entity, testRootEntity);

  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Entity,
    new DynamicCatalog(new CamelProcessorsProvider(testRootEntity)),
  );
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
