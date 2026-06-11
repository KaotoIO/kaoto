import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { CamelCatalogService, CatalogKind } from '../../models';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { fetchCamelCatalog } from './fetch-camel-catalog';

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

describe('fetchCamelCatalog', () => {
  let fetchFileMock: jest.SpyInstance;
  let setCatalogKeySpy: jest.SpyInstance;
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

    fetchFileMock = jest.spyOn(CatalogSchemaLoader, 'fetchFile');
    fetchFileMock.mockImplementation((uri: string) => {
      return Promise.resolve({ body: { [uri]: 'dummy-data' } });
    });

    setCatalogKeySpy = jest.spyOn(CamelCatalogService, 'setCatalogKey');
  });

  afterEach(() => {
    jest.clearAllMocks();
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
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-dataformats`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-loadbalancers`),
    );
    expect(fetchFileMock).toHaveBeenCalledWith(expect.stringContaining(`${relativeBasePath}/kamelets-aggregate`));
    expect(fetchFileMock).toHaveBeenCalledWith(expect.stringContaining(`${relativeBasePath}/kamelet-boundaries`));
    expect(fetchFileMock).toHaveBeenCalledWith(
      expect.stringContaining(`${relativeBasePath}/camel-catalog-aggregate-functions`),
    );
  });

  it('should set CamelCatalogService keys with the correct CatalogKind for each file', async () => {
    await fetchCamelCatalog({ catalogIndex: catalogDefinition, relativeBasePath });

    let count = 0;
    setCatalogKeySpy.mock.calls.forEach((call) => {
      if (Object.keys(call[1])[0].includes(`${relativeBasePath}/camel-catalog-aggregate-components`)) {
        expect(call[0]).toEqual(CatalogKind.Component);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].includes(`${relativeBasePath}/camel-catalog-aggregate-models`)) {
        expect(call[0]).toEqual(CatalogKind.Processor);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].includes(`${relativeBasePath}/camel-catalog-aggregate-patterns`)) {
        expect(call[0]).toEqual(CatalogKind.Pattern);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].includes(`${relativeBasePath}/camel-catalog-aggregate-entities`)) {
        expect(call[0]).toEqual(CatalogKind.Entity);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].includes(`${relativeBasePath}/camel-catalog-aggregate-languages`)) {
        expect(call[0]).toEqual(CatalogKind.Language);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].includes(`${relativeBasePath}/camel-catalog-aggregate-dataformats`)) {
        expect(call[0]).toEqual(CatalogKind.Dataformat);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].includes(`${relativeBasePath}/camel-catalog-aggregate-loadbalancers`)) {
        expect(call[0]).toEqual(CatalogKind.Loadbalancer);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].includes(`${relativeBasePath}/kamelet-boundaries`)) {
        expect(call[0]).toEqual(CatalogKind.Kamelet);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        expect(Object.keys(call[1])[1]).toContain(`${relativeBasePath}/kamelets-aggregate`);
        expect(Object.values(call[1])[1]).toEqual('dummy-data');
        count++;
      } else if (Object.keys(call[1])[0].includes(`${relativeBasePath}/camel-catalog-aggregate-functions`)) {
        expect(call[0]).toEqual(CatalogKind.Function);
        expect(Object.values(call[1])[0]).toEqual('dummy-data');
        count++;
      } else {
        throw new Error(`Unexpected setCatalogKey call: ${JSON.stringify(call)}`);
      }
    });
    expect(count).toEqual(setCatalogKeySpy.mock.calls.length);
  });
});
