import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { CamelCatalogService, CatalogKind } from '../../models';
import { CITRUS_TEST_ROOT_ENTITY_NAME } from '../../models/citrus/citrus-catalog-index';
import { citrusCatalogSelector, getFirstCitrusCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import { fetchCitrusCatalog } from './fetch-citrus-catalog';

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

describe('fetchCitrusCatalog', () => {
  let fetchFileMock: jest.SpyInstance;
  let setCatalogKeySpy: jest.SpyInstance;
  let catalogDefinition: Awaited<ReturnType<typeof getFirstCitrusCatalogMap>>['catalogDefinition'];
  let relativeBasePath: string;

  const catalogLibraryEntry = citrusCatalogSelector(catalogLibrary)!;
  const catalogPath = catalogLibraryEntry.fileName.substring(0, catalogLibraryEntry.fileName.lastIndexOf('/'));

  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    relativeBasePath = `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${catalogPath}`;

    fetchFileMock = jest.spyOn(CatalogSchemaLoader, 'fetchFile');
    fetchFileMock.mockImplementation((uri: string) => {
      return Promise.resolve({ body: { [uri]: 'dummy-data' } });
    });

    setCatalogKeySpy = jest.spyOn(CamelCatalogService, 'setCatalogKey');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register the root test schema (citrus-yaml) as a catalog entity', async () => {
    const setCatalogSpy = jest.spyOn(DynamicCatalogRegistry.get(), 'setCatalog');

    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    // The citrus-yaml schema file referenced in the index `schemas` section is fetched
    expect(fetchFileMock).toHaveBeenCalledWith(expect.stringContaining(`${relativeBasePath}/citrus-testcase`));

    // Registered into CamelCatalogService under CatalogKind.Entity, shaped like a propertiesSchema entity
    const entityCall = setCatalogKeySpy.mock.calls.find((call) => call[0] === CatalogKind.Entity);
    expect(entityCall).toBeDefined();
    expect(entityCall![1]).toHaveProperty(CITRUS_TEST_ROOT_ENTITY_NAME);
    expect(entityCall![1][CITRUS_TEST_ROOT_ENTITY_NAME]).toHaveProperty('propertiesSchema');

    // And registered into the DynamicCatalogRegistry, consistent with the other Citrus catalogs
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Entity, expect.anything());
    await expect(
      DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, CITRUS_TEST_ROOT_ENTITY_NAME),
    ).resolves.toHaveProperty('propertiesSchema');
  });

  it('should fetch all expected catalog files', async () => {
    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/citrus-catalog-aggregate-test-actions`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/citrus-catalog-aggregate-test-containers`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/citrus-catalog-aggregate-endpoints`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/citrus-catalog-aggregate-functions`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/citrus-catalog-aggregate-validation-matcher`),
    );
  });

  it('should set CamelCatalogService keys with the correct CatalogKind for each file', async () => {
    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    let count = 0;
    setCatalogKeySpy.mock.calls.forEach((call) => {
      if (Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-test-actions.json`)) {
        expect(call[0]).toEqual(CatalogKind.TestAction);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-test-containers.json`)
      ) {
        expect(call[0]).toEqual(CatalogKind.TestContainer);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-endpoints.json`)) {
        expect(call[0]).toEqual(CatalogKind.TestEndpoint);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-functions.json`)) {
        expect(call[0]).toEqual(CatalogKind.TestFunction);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-validation-matcher.json`)
      ) {
        expect(call[0]).toEqual(CatalogKind.TestValidationMatcher);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0] === CITRUS_TEST_ROOT_ENTITY_NAME) {
        expect(call[0]).toEqual(CatalogKind.Entity);
        expect(Object.values(call[1])[0]).toHaveProperty('propertiesSchema');
        count++;
      } else {
        throw new Error(`Unexpected setCatalogKey call: ${JSON.stringify(call)}`);
      }
    });
    expect(count).toEqual(setCatalogKeySpy.mock.calls.length);
  });
});
