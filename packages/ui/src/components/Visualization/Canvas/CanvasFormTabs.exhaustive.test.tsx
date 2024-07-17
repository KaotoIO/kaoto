import { AutoField, AutoFields } from '@kaoto-next/uniforms-patternfly';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { render } from '@testing-library/react';
import { AutoForm } from 'uniforms';
import {
  CamelCatalogService,
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
} from '../../../models';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SchemaService } from '../../Form';
import { CustomAutoFieldDetector } from '../../Form/CustomAutoField';

describe('CanvasFormTabs', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let patternCatalogMap: Record<string, ICamelProcessorDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;
  const schemaService = new SchemaService();

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    componentCatalogMap = catalogsMap.componentCatalogMap;
    patternCatalogMap = catalogsMap.patternCatalogMap;
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;

    CamelCatalogService.setCatalogKey(CatalogKind.Component, componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('CanvasForm Exhaustive tests', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should render for all component without an error', async () => {
      Object.entries(componentCatalogMap).forEach(([name, catalog]) => {
        try {
          if (name === 'default') return;
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          const schema = schemaService.getSchemaBridge((catalog as any).propertiesSchema);
          render(
            <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
              <AutoForm schema={schema!} model={{}} onChangeModel={() => {}}>
                <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
              </AutoForm>
            </AutoField.componentDetectorContext.Provider>,
          );
        } catch (e) {
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          throw new Error(`Error rendering ${name} component: ${(e as any).message}`);
        }
      });
    });

    it('should render for all kamelets without an error', async () => {
      Object.entries(kameletCatalogMap).forEach(([name, kamelet]) => {
        try {
          if (name === 'default') return;
          expect(kamelet).toBeDefined();
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          const schema = (kamelet as any).propertiesSchema;
          const bridge = schemaService.getSchemaBridge(schema);
          render(
            <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
              <AutoForm schema={bridge!} model={{}} onChangeModel={() => {}}>
                <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
              </AutoForm>
            </AutoField.componentDetectorContext.Provider>,
          );
        } catch (e) {
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          throw new Error(`Error rendering ${name} component: ${(e as any).message}`);
        }
      });
    });

    it('should render for all patterns without an error', async () => {
      Object.entries(patternCatalogMap).forEach(([name, pattern]) => {
        try {
          if (name === 'default') return;
          expect(pattern).toBeDefined();
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          const schema = (pattern as any).propertiesSchema;
          const bridge = schemaService.getSchemaBridge(schema);
          render(
            <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
              <AutoForm schema={bridge!} model={{}} onChangeModel={() => {}}>
                <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
              </AutoForm>
            </AutoField.componentDetectorContext.Provider>,
          );
        } catch (e) {
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          throw new Error(`Error rendering ${name} pattern: ${(e as any).message}`);
        }
      });
    });
  });
});
