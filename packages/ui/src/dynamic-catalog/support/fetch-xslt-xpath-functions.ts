import { CatalogDefinition, CatalogLibrary, XPathFunction } from '@kaoto/camel-catalog/types';

import { XSLT_CATALOG_VERSION } from '../../services/xpath/catalog/xpath-catalog-constants';
import { XPathCatalogConverter } from '../../services/xpath/catalog/xpath-catalog-converter';
import { XPathFunctionCatalogService } from '../../services/xpath/catalog/xpath-function-catalog.service';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';

/**
 * Fetches the XSLT XPath functions catalog from {@link @kaoto/camel-catalog} and stores the
 * converted result in {@link XPathFunctionCatalogService}. The XSLT catalog version to load
 * is determined by {@link XSLT_CATALOG_VERSION}.
 */
export async function fetchXsltXPathFunctions(basePath: string, catalogLibrary: CatalogLibrary): Promise<void> {
  if (!catalogLibrary.xsltCatalogs) return;

  const indexFile = `${basePath}/${catalogLibrary.xsltCatalogs}`;
  const relativeBasePath = CatalogSchemaLoader.getRelativeBasePath(indexFile);

  const xsltIndex = await CatalogSchemaLoader.fetchFile<CatalogDefinition>(indexFile);
  const xpathFunctionsEntry = xsltIndex.body.catalogs[XSLT_CATALOG_VERSION];
  if (!xpathFunctionsEntry) return;

  const functionsData = await CatalogSchemaLoader.fetchFile<Record<string, Record<string, XPathFunction>>>(
    `${relativeBasePath}/${xpathFunctionsEntry.file}`,
  );

  const converted = XPathCatalogConverter.convertCatalog(functionsData.body);
  XPathFunctionCatalogService.setCatalog(converted);
}
