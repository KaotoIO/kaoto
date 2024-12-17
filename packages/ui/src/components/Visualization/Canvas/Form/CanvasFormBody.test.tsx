import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, FromDefinition } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import {
  CamelCatalogService,
  CamelRouteVisualEntity,
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
} from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { CanvasFormTabsContext, SourceCodeProvider } from '../../../../providers';
import { TestProvidersWrapper } from '../../../../stubs';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { EventNotifier } from '../../../../utils';
import { SchemaService } from '../../../Form';
import { CanvasNode } from '../canvas.models';
import { CanvasFormBody } from './CanvasFormBody';

describe('CanvasFormBody', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let patternCatalogMap: Record<string, ICamelProcessorDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;
  let Provider: FunctionComponent<PropsWithChildren>;
  let entity: CamelRouteVisualEntity;
  let selectedNode: CanvasNode;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    componentCatalogMap = catalogsMap.componentCatalogMap;
    patternCatalogMap = catalogsMap.patternCatalogMap;
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;

    CamelCatalogService.setCatalogKey(CatalogKind.Component, componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, catalogsMap.dataformatCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Loadbalancer, catalogsMap.loadbalancerCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  const setupProvider = (camelFrom: { from: FromDefinition }) => {
    const camelResource = new CamelRouteResource([camelFrom]);
    const result = TestProvidersWrapper({ camelResource });
    Provider = result.Provider;
    entity = camelResource.getVisualEntities()[0];
    const rootNode = entity.toVizNode();
    const setHeaderNode = rootNode.getChildren()![1];
    selectedNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode: setHeaderNode,
      },
    };

    (result.updateSourceCodeFromEntitiesSpy as jest.Mock).mockImplementation(() => {
      const eventNotifier = EventNotifier.getInstance();
      const code = camelResource.toString();
      eventNotifier.next('entities:updated', code);
    });
  };

  describe('should persists changes from both expression editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const camelFrom: { from: FromDefinition } = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              setHeader: {
                name: 'foo',
              },
            },
          ],
        },
      };

      setupProvider(camelFrom);
    });

    it('expression => main form', async () => {
      const wrapper = render(
        <SourceCodeProvider>
          <Provider>
            <CanvasFormBody selectedNode={selectedNode} />
          </Provider>
        </SourceCodeProvider>,
      );

      await act(async () => {
        const expressionDropdownTrigger = wrapper.getByPlaceholderText(SchemaService.DROPDOWN_PLACEHOLDER);
        fireEvent.click(expressionDropdownTrigger);
      });

      await act(async () => {
        const simple = wrapper.getByTestId('expression-dropdownitem-simple');
        fireEvent.click(simple.getElementsByTagName('button')[0]);
      });

      await act(async () => {
        const expressionInput = wrapper.getByRole('textbox', { name: 'expression' });
        fireEvent.input(expressionInput, { target: { value: '${header.foo}' } });
      });

      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((entity.entityDef.route.from.steps[0].setHeader!.expression as any).simple.expression).toEqual(
        '${header.foo}',
      );
      expect(entity.entityDef.route.from.steps[0].setHeader!.name).toEqual('foo');

      await act(async () => {
        const nameInput = wrapper.getByLabelText(/name \*/i);
        fireEvent.input(nameInput, { target: { value: 'bar' } });
      });

      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((entity.entityDef.route.from.steps[0].setHeader!.expression as any).simple.expression).toEqual(
        '${header.foo}',
      );
      expect(entity.entityDef.route.from.steps[0].setHeader!.name).toEqual('bar');
    });

    it('main form => expression', async () => {
      const wrapper = render(
        <SourceCodeProvider>
          <Provider>
            <CanvasFormBody selectedNode={selectedNode} />
          </Provider>
        </SourceCodeProvider>,
      );

      await act(async () => {
        const nameInput = wrapper.getByLabelText(/name \*/i);
        fireEvent.input(nameInput, { target: { value: 'bar' } });
      });

      expect(entity.entityDef.route.from.steps[0].setHeader!.expression).toBeUndefined();
      expect(entity.entityDef.route.from.steps[0].setHeader!.name).toEqual('bar');

      await act(async () => {
        const expressionDropdownTrigger = wrapper.getByPlaceholderText(SchemaService.DROPDOWN_PLACEHOLDER);
        fireEvent.click(expressionDropdownTrigger);
      });

      await act(async () => {
        const simple = wrapper.getByTestId('expression-dropdownitem-simple');
        fireEvent.click(simple.getElementsByTagName('button')[0]);
      });

      await act(async () => {
        const expressionInput = wrapper.getByRole('textbox', { name: 'expression' });
        fireEvent.input(expressionInput, { target: { value: '${header.foo}' } });
      });

      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((entity.entityDef.route.from.steps[0].setHeader!.expression as any).simple.expression).toEqual(
        '${header.foo}',
      );
      expect(entity.entityDef.route.from.steps[0].setHeader!.name).toEqual('bar');
    });
  });

  describe('should persists changes from both dataformat editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const camelFrom: { from: FromDefinition } = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              marshal: {
                id: 'ms',
              },
            },
          ],
        },
      };

      setupProvider(camelFrom);
    });

    it('dataformat => main form', async () => {
      const wrapper = render(
        <SourceCodeProvider>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                onTabChange: jest.fn(),
              }}
            >
              <CanvasFormBody selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </SourceCodeProvider>,
      );

      await act(async () => {
        const dataformatDropdownTrigger = wrapper.getByPlaceholderText(SchemaService.DROPDOWN_PLACEHOLDER);
        fireEvent.click(dataformatDropdownTrigger);
      });

      await act(async () => {
        const avro = wrapper.getByTestId('dataformat-dropdownitem-avro');
        fireEvent.click(avro.getElementsByTagName('button')[0]);
      });

      expect(entity.entityDef.route.from.steps[0].marshal!.avro).toBeDefined();
      expect(entity.entityDef.route.from.steps[0].marshal!.id).toEqual('ms');

      await act(async () => {
        const [_avroIdInput, marshalIdInput] = wrapper.getAllByLabelText('Id', { selector: 'input' });
        fireEvent.input(marshalIdInput, { target: { value: 'modified' } });
      });

      expect(entity.entityDef.route.from.steps[0].marshal!.avro).toBeDefined();
      expect(entity.entityDef.route.from.steps[0].marshal!.id).toEqual('modified');
    });

    it('main form => dataformat', async () => {
      const wrapper = render(
        <SourceCodeProvider>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                onTabChange: jest.fn(),
              }}
            >
              <CanvasFormBody selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </SourceCodeProvider>,
      );

      await act(async () => {
        const [avroIdInput] = wrapper.getAllByLabelText('Id', { selector: 'input' });
        fireEvent.input(avroIdInput, { target: { value: 'modified' } });
      });

      expect(entity.entityDef.route.from.steps[0].marshal!.avro).toBeUndefined();
      expect(entity.entityDef.route.from.steps[0].marshal!.id).toEqual('modified');

      await act(async () => {
        const dataformatDropdownTrigger = wrapper.getByPlaceholderText(SchemaService.DROPDOWN_PLACEHOLDER);
        fireEvent.click(dataformatDropdownTrigger);
      });

      await act(async () => {
        const avro = wrapper.getByTestId('dataformat-dropdownitem-avro');
        fireEvent.click(avro.getElementsByTagName('button')[0]);
      });

      expect(entity.entityDef.route.from.steps[0].marshal!.avro).toBeDefined();
      expect(entity.entityDef.route.from.steps[0].marshal!.id).toEqual('modified');
    });
  });

  describe('should persists changes from both loadbalancer editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const camelFrom: { from: FromDefinition } = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'tutorial',
          },
          steps: [
            {
              loadBalance: {
                id: 'lb',
              },
            },
          ],
        },
      };

      setupProvider(camelFrom);
    });

    it('loadbalancer => main form', async () => {
      const wrapper = render(
        <SourceCodeProvider>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                onTabChange: jest.fn(),
              }}
            >
              <CanvasFormBody selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </SourceCodeProvider>,
      );

      await act(async () => {
        const expressionDropdownTrigger = wrapper.getByPlaceholderText(SchemaService.DROPDOWN_PLACEHOLDER);
        fireEvent.click(expressionDropdownTrigger);
      });

      await act(async () => {
        const weightedLoadBalancer = wrapper.getByTestId('loadbalancer-dropdownitem-weightedLoadBalancer');
        fireEvent.click(weightedLoadBalancer.getElementsByTagName('button')[0]);
      });

      expect(entity.entityDef.route.from.steps[0].loadBalance!.weightedLoadBalancer).toBeDefined();
      expect(entity.entityDef.route.from.steps[0].loadBalance!.id).toEqual('lb');

      const [weightedLBIdInput, loadBalanceIdInput] = wrapper.getAllByLabelText('Id', { selector: 'input' });
      await act(async () => {
        fireEvent.input(weightedLBIdInput, { target: { value: 'modified-lb-id' } });
      });

      await act(async () => {
        fireEvent.input(loadBalanceIdInput, { target: { value: 'modified-id' } });
      });

      expect(entity.entityDef.route.from.steps[0].loadBalance!.weightedLoadBalancer).toBeDefined();
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((entity.entityDef.route.from.steps[0].loadBalance!.weightedLoadBalancer as any).id).toEqual(
        'modified-lb-id',
      );
      expect(entity.entityDef.route.from.steps[0].loadBalance!.id).toEqual('modified-id');
    });

    it('main form => loadbalancer', async () => {
      const wrapper = render(
        <SourceCodeProvider>
          <Provider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                onTabChange: jest.fn(),
              }}
            >
              <CanvasFormBody selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </Provider>
        </SourceCodeProvider>,
      );

      await act(async () => {
        const loadBalanceIdInput = wrapper.getByLabelText('Id', { selector: 'input' });
        fireEvent.input(loadBalanceIdInput, { target: { value: 'modified' } });
      });

      expect(entity.entityDef.route.from.steps[0].loadBalance!.weightedLoadBalancer).toBeUndefined();
      expect(entity.entityDef.route.from.steps[0].loadBalance!.id).toEqual('modified');

      await act(async () => {
        const expressionDropdownTrigger = wrapper.getByPlaceholderText(SchemaService.DROPDOWN_PLACEHOLDER);
        fireEvent.click(expressionDropdownTrigger);
      });

      await act(async () => {
        const weightedLoadBalancer = wrapper.getByTestId('loadbalancer-dropdownitem-weightedLoadBalancer');
        fireEvent.click(weightedLoadBalancer.getElementsByTagName('button')[0]);
      });

      expect(entity.entityDef.route.from.steps[0].loadBalance!.weightedLoadBalancer).toBeDefined();
      expect(entity.entityDef.route.from.steps[0].loadBalance!.id).toEqual('modified');
    });
  });
});
