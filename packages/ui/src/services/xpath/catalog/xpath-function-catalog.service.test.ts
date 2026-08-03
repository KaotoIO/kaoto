import { FunctionGroup } from '../xpath-model';
import { XPathFunctionCatalogService } from './xpath-function-catalog.service';

describe('XPathFunctionCatalogService', () => {
  afterEach(() => {
    XPathFunctionCatalogService.clear();
  });

  it('should return undefined when no catalog is set', () => {
    expect(XPathFunctionCatalogService.getCatalog()).toBeUndefined();
  });

  it('should store and retrieve a catalog', () => {
    const catalog = {
      [FunctionGroup.String]: [
        {
          name: 'concat',
          displayName: 'Concatenate',
          description: 'Concatenates strings',
          returnType: 'string' as never,
          arguments: [],
        },
      ],
    };
    XPathFunctionCatalogService.setCatalog(catalog);
    expect(XPathFunctionCatalogService.getCatalog()).toBe(catalog);
  });

  it('should clear the catalog', () => {
    XPathFunctionCatalogService.setCatalog({});
    XPathFunctionCatalogService.clear();
    expect(XPathFunctionCatalogService.getCatalog()).toBeUndefined();
  });
});
