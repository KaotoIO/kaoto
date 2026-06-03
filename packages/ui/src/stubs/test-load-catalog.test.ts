import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { citrusCatalogSelector, testLoadCatalog, testLoadCitrusCatalog } from './test-load-catalog';

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

describe('testLoadCatalog()', () => {
  it('should load Camel catalog', async () => {
    const answer = await testLoadCatalog(catalogLibrary.definitions[0]);
    expect(answer).toBeDefined();
    expect(answer.catalogDefinition).toBeDefined();
    expect(answer.catalogPath).toContain('@kaoto/camel-catalog/camel-');
    expect(answer.componentCatalogMap).toBeDefined();
  });

  it('should load Citrus catalog', async () => {
    const citrusLibrary = citrusCatalogSelector(catalogLibrary);
    expect(citrusLibrary).toBeDefined();
    const answer = await testLoadCitrusCatalog(citrusLibrary!);
    expect(answer).toBeDefined();
    expect(answer.catalogDefinition).toBeDefined();
    expect(answer.catalogDefinition.runtime).toEqual('Citrus');
    expect(answer.actionsCatalogMap).toBeDefined();
    expect(answer.containersCatalogMap).toBeDefined();
    expect(answer.endpointsCatalogMap).toBeDefined();
  });
});
