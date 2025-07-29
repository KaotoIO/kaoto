import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteDefinition } from '@kaoto/camel-catalog/types';
import { CanvasFormTabsContext, SuggestionRegistryProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  CamelCatalogService,
  CamelRouteVisualEntity,
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
} from '../../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../../models/visualization/base-visual-entity';
import { VisibleFlowsProvider } from '../../../../providers';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { TestProvidersWrapper } from '../../../../stubs';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { ROOT_PATH } from '../../../../utils';
import { CanvasFormBody } from './CanvasFormBody';

describe('CanvasFormBody', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let patternCatalogMap: Record<string, ICamelProcessorDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;

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

  describe('should persists changes from both expression editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('expression => main form', async () => {
      const camelRoute = {
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
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode().nodes[0];
      const setHeaderNode = rootNode.getChildren()![1];

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsContext.Provider
                value={{
                  selectedTab: 'All',
                  setSelectedTab: jest.fn(),
                }}
              >
                <CanvasFormBody vizNode={setHeaderNode} />
              </CanvasFormTabsContext.Provider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('simple');
      await formPageObject.inputText('Expression', '${header.foo}');

      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((camelRoute.from.steps[0].setHeader! as any).simple.expression).toEqual('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toEqual('foo');

      await formPageObject.inputText('Name', 'bar');

      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((camelRoute.from.steps[0].setHeader! as any).simple.expression).toEqual('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toEqual('bar');
    });

    it('main form => expression', async () => {
      const camelRoute = {
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
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode().nodes[0];
      const setHeaderNode = rootNode.getChildren()![1];

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsContext.Provider
                value={{
                  selectedTab: 'All',
                  setSelectedTab: jest.fn(),
                }}
              >
                <CanvasFormBody vizNode={setHeaderNode} />
              </CanvasFormTabsContext.Provider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.inputText('Name', 'bar');

      expect(camelRoute.from.steps[0].setHeader!.simple).toBeUndefined();
      expect(camelRoute.from.steps[0].setHeader!.name).toEqual('bar');

      await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('simple');
      await formPageObject.inputText('Expression', '${header.foo}');

      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((camelRoute.from.steps[0].setHeader! as any).simple.expression).toEqual('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toEqual('bar');
    });
  });

  describe('should persists changes from both dataformat editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('dataformat => main form', async () => {
      const camelRoute = {
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
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode().nodes[0];
      const marshalNode = rootNode.getChildren()![1];

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsContext.Provider
                value={{
                  selectedTab: 'All',
                  setSelectedTab: jest.fn(),
                }}
              >
                <CanvasFormBody vizNode={marshalNode} />
              </CanvasFormTabsContext.Provider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('avro');

      await formPageObject.inputText('Id', 'avro-id', { index: 1 });

      expect((camelRoute.from.steps[0].marshal!.avro as any).id).toEqual('avro-id');
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('ms');

      await formPageObject.inputText('Id', 'modified', { index: 0 });
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('modified');
    });

    it('main form => dataformat', async () => {
      const camelRoute = {
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
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode().nodes[0];
      const marshalNode = rootNode.getChildren()![1];

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsContext.Provider
                value={{
                  selectedTab: 'All',
                  setSelectedTab: jest.fn(),
                }}
              >
                <CanvasFormBody vizNode={marshalNode} />
              </CanvasFormTabsContext.Provider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.inputText('Id', 'modified', { index: 0 });
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('modified');

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('avro');
      await formPageObject.inputText('Id', 'avro-id', { index: 1 });

      expect((camelRoute.from.steps[0].marshal!.avro as any).id).toEqual('avro-id');
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('modified');
    });
  });

  describe('should persists changes from both loadbalancer editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('loadbalancer => main form', async () => {
      const camelRoute = {
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
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode().nodes[0];
      const loadBalanceNode = rootNode.getChildren()![1];

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsContext.Provider
                value={{
                  selectedTab: 'All',
                  setSelectedTab: jest.fn(),
                }}
              >
                <CanvasFormBody vizNode={loadBalanceNode} />
              </CanvasFormTabsContext.Provider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('weighted load balancer');

      await formPageObject.inputText('Distribution Ratio', '3.5');
      expect((camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer as any).distributionRatio).toEqual('3.5');
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('lb');

      await formPageObject.inputText('Id', 'modified', { index: 0 });
      expect((camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer as any).distributionRatio).toEqual('3.5');
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');
    });

    it('main form => loadbalancer', async () => {
      const camelRoute = {
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
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode().nodes[0];
      const loadBalanceNode = rootNode.getChildren()![1];

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsContext.Provider
                value={{
                  selectedTab: 'All',
                  setSelectedTab: jest.fn(),
                }}
              >
                <CanvasFormBody vizNode={loadBalanceNode} />
              </CanvasFormTabsContext.Provider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);
      await formPageObject.showAllFields();
      await formPageObject.inputText('Id', 'modified', { index: 0 });
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('weighted load balancer');

      await formPageObject.inputText('Distribution Ratio', '3.5');
      expect((camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer as any).distributionRatio).toEqual('3.5');
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');
    });
  });

  it('should show suggestions', async () => {
    const { Provider, camelResource } = TestProvidersWrapper();
    const vizNode = camelResource.getVisualEntities()[0].toVizNode().nodes[0];
    jest.spyOn(vizNode, 'getComponentSchema').mockReturnValue({
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: 'Name',
          },
        },
      },
      definition: {
        name: 'test-component',
      },
    } as VisualComponentSchema);

    const wrapper = render(
      <Provider>
        <CanvasFormTabsContext.Provider
          value={{
            selectedTab: 'All',
            setSelectedTab: jest.fn(),
          }}
        >
          <CanvasFormBody vizNode={vizNode} />
        </CanvasFormTabsContext.Provider>
      </Provider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    const inputField = formPageObject.getFieldByDisplayName('Name')!;

    await act(async () => {
      fireEvent.focus(inputField);
      fireEvent.keyDown(inputField, { ctrlKey: true, code: 'Space' });
    });

    await waitFor(() => {
      expect(wrapper.getByTestId('suggestions-menu')).toBeInTheDocument();
    });
  });
});
