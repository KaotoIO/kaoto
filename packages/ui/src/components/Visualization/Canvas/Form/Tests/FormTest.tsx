import { AutoField, AutoFields, AutoForm } from '@kaoto-next/uniforms-patternfly';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { render } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, KaotoSchemaDefinition } from '../../../../../models';
import { getFirstCatalogMap } from '../../../../../stubs/test-load-catalog';
import { SchemaService } from '../../../../Form';
import { CustomAutoFieldDetector } from '../../../../Form/CustomAutoField';
import { getSchemasSlice } from './get-schemas-slices';

export const FormTest = (target: { kind: CatalogKind; range: { start: number; end: number | undefined } }) => {
  let schemas: [string, KaotoSchemaDefinition['schema']][] = [];

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);

    schemas = getSchemasSlice(CamelCatalogService.getCatalogByKey(target.kind), target.range);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should have schemas', () => {
    expect(schemas).not.toHaveLength(0);
  });

  it('should render the form without an error', () => {
    schemas.forEach(([name, schema]) => {
      try {
        const schemaService = new SchemaService();
        const schemaBridge = schemaService.getSchemaBridge(schema);
        render(
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schemaBridge!} model={{}} onChangeModel={() => {}}>
              <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>,
        );
      } catch (e) {
        console.error(e);
        throw new Error(`Error rendering ${name} ${target.kind}`);
      }
    });
  });
};
