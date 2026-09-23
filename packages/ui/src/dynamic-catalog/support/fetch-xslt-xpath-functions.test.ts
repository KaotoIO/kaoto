import { CatalogLibrary, XPathFunction } from '@kaoto/camel-catalog/types';

import { XSLT_CATALOG_VERSION } from '../../services/xpath/catalog/xpath-catalog-constants';
import { XPathCatalogConverter } from '../../services/xpath/catalog/xpath-catalog-converter';
import { XPathFunctionCatalogService } from '../../services/xpath/catalog/xpath-function-catalog.service';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { fetchXsltXPathFunctions } from './fetch-xslt-xpath-functions';

describe('fetchXsltXPathFunctions', () => {
  const mockLibrary: CatalogLibrary = {
    name: 'test-catalog',
    version: 3,
    definitions: [],
    starterTemplates: 'starter-templates/index-1234.json',
    xsltCatalogs: 'xslt/index-1234.json',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return early when xsltCatalogs is not defined', async () => {
    const fetchSpy = vi.spyOn(CatalogSchemaLoader, 'fetchFile');
    const setCatalogSpy = vi.spyOn(XPathFunctionCatalogService, 'setCatalog');

    const libraryWithoutXslt: CatalogLibrary = {
      ...mockLibrary,
      xsltCatalogs: undefined as unknown as string,
    };

    await fetchXsltXPathFunctions('base/path', libraryWithoutXslt);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setCatalogSpy).not.toHaveBeenCalled();
  });

  it('should return early when the requested XSLT version entry is not in the index', async () => {
    vi.spyOn(CatalogSchemaLoader, 'fetchFile').mockResolvedValueOnce({
      body: {
        name: 'XSLT Catalogs',
        version: '1',
        runtime: 'XSLT',
        catalogs: {},
        schemas: {},
      },
      headers: new Headers(),
      statusCode: 200,
    } as never);

    const setCatalogSpy = vi.spyOn(XPathFunctionCatalogService, 'setCatalog');

    await fetchXsltXPathFunctions('base/path', mockLibrary);

    expect(setCatalogSpy).not.toHaveBeenCalled();
  });

  it('should fetch the functions file and set the catalog in XPathFunctionCatalogService', async () => {
    const mockFunctions: Record<string, Record<string, XPathFunction>> = {
      'fn:string': {
        concat: {
          name: 'concat',
          signatures: [],
        } as unknown as XPathFunction,
      },
    };

    vi.spyOn(CatalogSchemaLoader, 'fetchFile')
      .mockResolvedValueOnce({
        body: {
          name: 'XSLT Catalogs',
          version: '1',
          runtime: 'XSLT',
          catalogs: {
            [XSLT_CATALOG_VERSION]: {
              name: '3.0',
              version: '3.0',
              description: 'XPath 3.1 and XSLT 3.0 function catalog',
              file: '3.0/xslt-xpath-functions.json',
            },
          },
          schemas: {},
        },
        headers: new Headers(),
        statusCode: 200,
      } as never)
      .mockResolvedValueOnce({
        body: mockFunctions,
        headers: new Headers(),
        statusCode: 200,
      } as never);

    const convertSpy = vi.spyOn(XPathCatalogConverter, 'convertCatalog');
    const setCatalogSpy = vi.spyOn(XPathFunctionCatalogService, 'setCatalog');

    await fetchXsltXPathFunctions('base/path', mockLibrary);

    expect(convertSpy).toHaveBeenCalledWith(mockFunctions);
    expect(setCatalogSpy).toHaveBeenCalled();
  });
});
