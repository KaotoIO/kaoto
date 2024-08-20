import { AutoField, AutoFields, AutoForm } from '@kaoto-next/uniforms-patternfly';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { render } from '@testing-library/react';
import { CamelCatalogService, CatalogKind, IKameletDefinition } from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SchemaService } from '../../Form';
import { CustomAutoFieldDetector } from '../../Form/CustomAutoField';

describe('Form - Kamelets', () => {
  let kameletCatalogMap: Record<string, IKameletDefinition>;
  const schemaService = new SchemaService();

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;

    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render for all Kamelets without an error', async () => {
    Object.entries(kameletCatalogMap).forEach(([name, catalog]) => {
      try {
        if (name === 'default') return;

        const schema = schemaService.getSchemaBridge(catalog.propertiesSchema);
        render(
          <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
            <AutoForm schema={schema!} model={{}} onChangeModel={() => {}}>
              <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
            </AutoForm>
          </AutoField.componentDetectorContext.Provider>,
        );
      } catch (e) {
        throw new Error(`Error rendering ${name} Kamelet: \n ${e}`);
      }
    });
  });
});
