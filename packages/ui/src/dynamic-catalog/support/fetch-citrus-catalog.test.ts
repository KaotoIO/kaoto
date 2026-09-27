import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { stringify } from 'yaml';

import { CatalogKind, FileTypes, ICitrusTestActionTemplateDefinition } from '../../models';
import { CITRUS_TEST_ROOT_ENTITY_NAME } from '../../models/citrus/citrus-catalog-index';
import { citrusCatalogSelector, getFirstCitrusCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import { fetchCitrusCatalog } from './fetch-citrus-catalog';

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

describe('fetchCitrusCatalog', () => {
  let fetchFileMock: SpyInstance;
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
  });

  afterEach(() => {
    vi.clearAllMocks();
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('registers host templates in the dynamic registry', async () => {
    const getResourcesContentByType = vi
      .fn()
      .mockResolvedValue([{ filename: 'prepare-order.citrus.yaml', content: stringify(template) }]);

    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath, getResourcesContentByType });

    await expect(
      DynamicCatalogRegistry.get().getEntity(CatalogKind.TestActionTemplate, template.name),
    ).resolves.toEqual(template);
    expect(getResourcesContentByType).toHaveBeenCalledWith(FileTypes.CitrusTemplates);
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

  it('rejects failed built-in catalog requests before changing the registry', async () => {
    const error = new Error('Catalog unavailable');
    fetchFileMock.mockRejectedValue(error);
    const setCatalogSpy = vi.spyOn(DynamicCatalogRegistry.get(), 'setCatalog');

    await expect(fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath })).rejects.toThrow(error);

    expect(setCatalogSpy).not.toHaveBeenCalled();
  });

  it('should register the root test schema (citrus-yaml) as a catalog entity in DynamicCatalogRegistry', async () => {
    const setCatalogSpy = vi.spyOn(DynamicCatalogRegistry.get(), 'setCatalog');

    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    // The citrus-yaml schema file referenced in the index `schemas` section is fetched
    expect(fetchFileMock).toHaveBeenCalledWith(expect.stringContaining(`${relativeBasePath}/citrus-testcase`));

    // Registered into the DynamicCatalogRegistry under CatalogKind.Entity
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

  it('should register all catalogs into DynamicCatalogRegistry', async () => {
    const setCatalogSpy = vi.spyOn(DynamicCatalogRegistry.get(), 'setCatalog');

    await fetchCitrusCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Entity, expect.anything());
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.TestAction, expect.anything());
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.TestActionTemplate, expect.anything());
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.TestContainer, expect.anything());
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.TestEndpoint, expect.anything());
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.TestFunction, expect.anything());
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.TestValidationMatcher, expect.anything());
  });
});
