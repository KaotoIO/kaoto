import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../models';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import { fetchCamelCatalog } from './fetch-camel-catalog';

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

describe('fetchCamelCatalog', () => {
  let fetchFileMock: SpyInstance;
  let setCatalogSpy: SpyInstance;
  let catalogDefinition: Awaited<ReturnType<typeof getFirstCatalogMap>>['catalogDefinition'];
  let relativeBasePath: string;

  const [catalogLibraryEntry] = catalogLibrary.definitions;
  const catalogPath = catalogLibraryEntry.fileName.substring(0, catalogLibraryEntry.fileName.lastIndexOf('/'));

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary);
    catalogDefinition = catalogsMap.catalogDefinition;
  });

  beforeEach(() => {
    relativeBasePath = `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/${catalogPath}`;

    fetchFileMock = vi.spyOn(CatalogSchemaLoader, 'fetchFile');
    fetchFileMock.mockImplementation((uri: string) => {
      return Promise.resolve({ body: { [uri]: 'dummy-data' } });
    });

    setCatalogSpy = vi.spyOn(DynamicCatalogRegistry.get(), 'setCatalog');
  });

  afterEach(() => {
    vi.clearAllMocks();
    DynamicCatalogRegistry.get().clearRegistry();
  });

  it('should fetch all expected catalog files', async () => {
    await fetchCamelCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-components`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-models`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-patterns`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-entities`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-languages`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(expect.stringContaining(`${relativeBasePath}/kamelets-aggregate`));
    expect(fetchFileMock).toHaveBeenCalledWith(expect.stringContaining(`${relativeBasePath}/kamelet-boundaries`));
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-functions`),
    );
  });

  it('should register catalogs in DynamicCatalogRegistry with the correct CatalogKind for each file', async () => {
    await fetchCamelCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Component, expect.any(Object));
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Processor, expect.any(Object));
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Pattern, expect.any(Object));
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Entity, expect.any(Object));
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Language, expect.any(Object));
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Kamelet, expect.any(Object));
    expect(setCatalogSpy).toHaveBeenCalledWith(CatalogKind.Function, expect.any(Object));
  });
});
