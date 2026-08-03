import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { FunctionGroup } from '../xpath-model';

/**
 * Static store for the converted XPath/XSLT function catalog loaded from {@link @kaoto/camel-catalog}.
 * Populated by {@link fetchXsltXPathFunctions} at startup; consumed by {@link XPathService} with a
 * fallback to the hardcoded XPath 2.0 definitions when the catalog is unavailable.
 */
export class XPathFunctionCatalogService {
  private static catalog: Partial<Record<FunctionGroup, IFunctionDefinition[]>> | undefined;

  static setCatalog(catalog: Partial<Record<FunctionGroup, IFunctionDefinition[]>>): void {
    this.catalog = catalog;
  }

  static getCatalog(): Partial<Record<FunctionGroup, IFunctionDefinition[]>> | undefined {
    return this.catalog;
  }

  static clear(): void {
    this.catalog = undefined;
  }
}
