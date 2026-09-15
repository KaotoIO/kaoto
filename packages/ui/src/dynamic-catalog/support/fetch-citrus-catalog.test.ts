import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { stringify } from 'yaml';

import { CamelCatalogService, CatalogKind, FileTypes, ICitrusTestActionTemplateDefinition } from '../../models';
import { CITRUS_TEST_ROOT_ENTITY_NAME } from '../../models/citrus/citrus-catalog-index';
import { citrusCatalogSelector, getFirstCitrusCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import { fetchCitrusCatalog } from './fetch-citrus-catalog';

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

describe('fetchCitrusCatalog', () => {
  let fetchFileMock: SpyInstance;
  let setCatalogKeySpy: SpyInstance;
  let catalogDefinition: Awaited<ReturnType<typeof getFirstCitrusCatalogMap>>['catalogDefinition'];
  let relativeBasePath: string;

  const catalogLibraryEntry = citrusCatalogSelector(catalogLibrary)!;
  const catalogPath = catalogLibraryEntry.fileName.substring(0, catalogLibraryEntry.fileName.lastIndexOf('/'));
  const template: ICitrusTestActionTemplateDefinition = {
    kind: CatalogKind.TestActionTemplate,
    name: 'prepare-order',
    description: 'Prepare an order',
    parameters: [{ name: 'region', value: '${region}' }],
  };

  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    relativeBasePath = `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${catalogPath}`;

    fetchFileMock = vi.spyOn(CatalogSchemaLoader, 'fetchFile');
    fetchFileMock.mockImplementation((uri: string) => {
      return Promise.resolve({ body: { [uri]: 'dummy-data' } });
    });

    setCatalogKeySpy = vi.spyOn(CamelCatalogService, 'setCatalogKey');
  });

  afterEach(() => {
    vi.clearAllMocks();
    CamelCatalogService.clearCatalogs();
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('registers host templates only in the dynamic registry', async () => {
    const getResourcesContentByType = vi
      .fn()
      .mockResolvedValue([{ filename: 'prepare-order.citrus.yaml', content: stringify(template) }]);

    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath, getResourcesContentByType });

    await expect(
      DynamicCatalogRegistry.get().getEntity(CatalogKind.TestActionTemplate, template.name),
    ).resolves.toEqual(template);
    expect(getResourcesContentByType).toHaveBeenCalledWith(FileTypes.CitrusTemplates);
    expect(setCatalogKeySpy).not.toHaveBeenCalledWith(CatalogKind.TestActionTemplate, expect.anything());
  });

  it('clears previous host templates when loading without a resource callback', async () => {
    await fetchCitrusCatalog({
      catalogIndex: catalogDefinition,
      relativeBasePath,
      getResourcesContentByType: async () => [{ filename: 'prepare-order.citrus.yaml', content: stringify(template) }],
    });
    await expect(
      DynamicCatalogRegistry.get().getEntity(CatalogKind.TestActionTemplate, template.name),
    ).resolves.toEqual(template);

    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    await expect(DynamicCatalogRegistry.get().getCatalog(CatalogKind.TestActionTemplate)?.getAll()).resolves.toEqual(
      {},
    );
  });

  it('rejects failed built-in catalog requests before changing either registry', async () => {
    const error = new Error('Catalog unavailable');
    fetchFileMock.mockRejectedValue(error);
    const setCatalogSpy = vi.spyOn(DynamicCatalogRegistry.get(), 'setCatalog');

    await expect(fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath })).rejects.toThrow(error);

    expect(setCatalogKeySpy).not.toHaveBeenCalled();
    expect(setCatalogSpy).not.toHaveBeenCalled();
  });

  it('should register the root test schema (citrus-yaml) as a catalog entity', async () => {
    const setCatalogSpy = vi.spyOn(DynamicCatalogRegistry.get(), 'setCatalog');

    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    // The citrus-yaml schema file referenced in the index `schemas` section is fetched
    expect(fetchFileMock).toHaveBeenCalledWith(expect.stringContaining(`${relativeBasePath}/citrus-testcase`));

    // Registered into CamelCatalogService under CatalogKind.Entity, shaped like a propertiesSchema entity
    const entityCall = setCatalogKeySpy.mock.calls.find((call: CatalogKind[]) => call[0] === CatalogKind.Entity);
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
    setCatalogKeySpy.mock.calls.forEach((call: ({ [s: string]: unknown } | ArrayLike<unknown>)[]) => {
      if (Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-test-actions.json`)) {
        expect(call[0]).toEqual(CatalogKind.TestAction);
        expect(Object.values(call[1])[0]).toBe('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-test-containers.json`)
      ) {
        expect(call[0]).toEqual(CatalogKind.TestContainer);
        expect(Object.values(call[1])[0]).toBe('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-endpoints.json`)) {
        expect(call[0]).toEqual(CatalogKind.TestEndpoint);
        expect(Object.values(call[1])[0]).toBe('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-functions.json`)) {
        expect(call[0]).toEqual(CatalogKind.TestFunction);
        expect(Object.values(call[1])[0]).toBe('dummy-data');
        count++;
      } else if (
        Object.keys(call[1])[0].endsWith(`${relativeBasePath}/citrus-catalog-aggregate-validation-matcher.json`)
      ) {
        expect(call[0]).toEqual(CatalogKind.TestValidationMatcher);
        expect(Object.values(call[1])[0]).toBe('dummy-data');
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
