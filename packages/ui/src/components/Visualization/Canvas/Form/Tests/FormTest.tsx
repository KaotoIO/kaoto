import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { KaotoForm } from '@kaoto/forms';
import { render } from '@testing-library/react';

import { DynamicCatalogRegistry } from '../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, KaotoSchemaDefinition } from '../../../../../models';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../../../stubs/test-load-catalog';
import { getSchemasSlice } from './get-schemas-slices';

export const FormTest = (target: {
  kind: CatalogKind.Component | CatalogKind.Pattern | CatalogKind.Kamelet;
  range: { start: number; end: number | undefined };
}) => {
  let schemas: [string, KaotoSchemaDefinition['schema']][] = [];

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);

    const catalogMap = {
      [CatalogKind.Component]: catalogsMap.componentCatalogMap,
      [CatalogKind.Pattern]: catalogsMap.patternCatalogMap,
      [CatalogKind.Kamelet]: catalogsMap.kameletsCatalogMap,
    }[target.kind];
    schemas = getSchemasSlice(catalogMap, target.range);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
    vi.clearAllMocks();
  });

  it('should have schemas', () => {
    expect(schemas).not.toHaveLength(0);
  });

  it('should render the form without an error', () => {
    schemas.forEach(([name, schema]) => {
      try {
        render(<KaotoForm schema={schema} onChangeProp={vi.fn()} model={{}} />);
      } catch (e) {
        console.error(e);
        throw new Error(`Error rendering ${name} ${target.kind}`);
      }
    });
  });
};
