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
  const xsltEntry = catalogLibrary.definitions.find((d) => d.runtime === 'XSLT' && d.version === XSLT_CATALOG_VERSION);
  if (!xsltEntry) return;

  const indexFile = `${basePath}/${xsltEntry.fileName}`;
  const relativeBasePath = CatalogSchemaLoader.getRelativeBasePath(indexFile);

  const subIndex = await CatalogSchemaLoader.fetchFile<CatalogDefinition>(indexFile);
  const xpathFunctionsEntry = subIndex.body.catalogs['xpathFunctions'];
  if (!xpathFunctionsEntry) return;

  const functionsData = await CatalogSchemaLoader.fetchFile<Record<string, Record<string, XPathFunction>>>(
    `${relativeBasePath}/${xpathFunctionsEntry.file}`,
  );

  const converted = XPathCatalogConverter.convertCatalog(functionsData.body);
  XPathFunctionCatalogService.setCatalog(converted);
}
