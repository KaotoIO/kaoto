import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteDefinition } from '@kaoto/camel-catalog/types';
import { CanvasFormTabsContext, CanvasFormTabsProvider, SuggestionRegistryProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CamelCatalogService,
  CamelRouteVisualEntity,
  CatalogKind,
  createVisualizationNode,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
  KameletVisualEntity,
  KaotoSchemaDefinition,
} from '../../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../../models/visualization/base-visual-entity';
import { VisualFlowsApi } from '../../../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext, VisibleFlowsProvider } from '../../../../providers';
import { EntitiesContext, EntitiesProvider } from '../../../../providers/entities.provider';
import { camelRouteJson, kameletJson } from '../../../../stubs';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { ROOT_PATH } from '../../../../utils';
import { CanvasNode } from '../canvas.models';
import { FlowService } from '../flow.service';
import { CanvasForm } from './CanvasForm';

describe('CanvasForm', () => {
  let camelRouteVisualEntity: CamelRouteVisualEntity;
  let selectedNode: CanvasNode;
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

  beforeEach(() => {
    camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
    const { nodes } = FlowService.getFlowDiagram('test', camelRouteVisualEntity.toVizNode());
    selectedNode = nodes[2]; // choice
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    const { container } = render(
      <EntitiesProvider>
        <VisibleFlowsProvider>
          <SuggestionRegistryProvider>
            <CanvasFormTabsProvider>
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsProvider>
          </SuggestionRegistryProvider>
        </VisibleFlowsProvider>
      </EntitiesProvider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render nothing if no schema is available', () => {
    const vizNode = createVisualizationNode('route', {
      path: CamelRouteVisualEntity.ROOT_PATH,
      entity: new CamelRouteVisualEntity(camelRouteJson),
      isGroup: true,
      processorName: 'route',
    });

    const selectedNode: CanvasNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode,
      },
    };

    jest.spyOn(vizNode, 'getComponentSchema').mockReturnValue(undefined);

    const { container } = render(
      <EntitiesContext.Provider value={null}>
        <VisibleFlowsProvider>
          <SuggestionRegistryProvider>
            <CanvasFormTabsProvider>
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsProvider>
          </SuggestionRegistryProvider>
        </VisibleFlowsProvider>
      </EntitiesContext.Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render nothing if no schema and no definition is available', () => {
    const visualComponentSchema: VisualComponentSchema = {
      schema: null as unknown as KaotoSchemaDefinition['schema'],
      definition: null,
    };

    const vizNode = createVisualizationNode('route', {
      path: CamelRouteVisualEntity.ROOT_PATH,
      entity: new CamelRouteVisualEntity(camelRouteJson),
      isGroup: true,
      processorName: 'route',
    });

    const selectedNode: CanvasNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode,
      },
    };

    jest.spyOn(vizNode, 'getComponentSchema').mockReturnValue(visualComponentSchema);

    const { container } = render(
      <EntitiesContext.Provider value={null}>
        <VisibleFlowsProvider>
          <SuggestionRegistryProvider>
            <CanvasFormTabsProvider>
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsProvider>
          </SuggestionRegistryProvider>
        </VisibleFlowsProvider>
      </EntitiesContext.Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it("should serialize empty strings `''` as `undefined`", async () => {
    const flowId = camelRouteVisualEntity.id;
    const dispatchSpy = jest.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = FlowService.getFlowDiagram('test', camelRouteVisualEntity.toVizNode());
    selectedNode = nodes[nodes.length - 1];

    render(
      <EntitiesProvider>
        <VisibleFlowsContext.Provider
          value={{ visibleFlows: { [flowId]: true }, allFlowsVisible: true, visualFlowsApi }}
        >
          <SuggestionRegistryProvider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: jest.fn(),
              }}
            >
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </SuggestionRegistryProvider>
        </VisibleFlowsContext.Provider>
      </EntitiesProvider>,
    );

    const idField = screen.getAllByLabelText('Description', { selector: 'textarea' })[0];
    act(() => {
      fireEvent.change(idField, { target: { value: '' } });
    });

    const closeSideBarButton = screen.getByTestId('close-side-bar');
    act(() => {
      fireEvent.click(closeSideBarButton);
    });

    expect(camelRouteVisualEntity.entityDef.route.description).toBeUndefined();
  });

  it("should serialize empty strings(with space characters) `' '` as `undefined`", async () => {
    const flowId = camelRouteVisualEntity.id;
    const dispatchSpy = jest.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = FlowService.getFlowDiagram('test', camelRouteVisualEntity.toVizNode());
    selectedNode = nodes[nodes.length - 1];

    render(
      <EntitiesProvider>
        <VisibleFlowsContext.Provider
          value={{ visibleFlows: { [flowId]: true }, allFlowsVisible: true, visualFlowsApi }}
        >
          <SuggestionRegistryProvider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: jest.fn(),
              }}
            >
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </SuggestionRegistryProvider>
        </VisibleFlowsContext.Provider>
      </EntitiesProvider>,
    );

    const idField = screen.getAllByLabelText('Description', { selector: 'textarea' })[0];
    act(() => {
      fireEvent.change(idField, { target: { value: ' ' } });
    });

    const closeSideBarButton = screen.getByTestId('close-side-bar');
    act(() => {
      fireEvent.click(closeSideBarButton);
    });

    expect(camelRouteVisualEntity.entityDef.route.description).toBeUndefined();
  });

  it('should allow consumers to update the Camel Route ID', async () => {
    const flowId = camelRouteVisualEntity.id;
    const newName = 'MyNewId';
    const dispatchSpy = jest.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = FlowService.getFlowDiagram('test', camelRouteVisualEntity.toVizNode());
    selectedNode = nodes[nodes.length - 1];

    render(
      <EntitiesProvider>
        <VisibleFlowsContext.Provider
          value={{ visibleFlows: { [flowId]: true }, allFlowsVisible: true, visualFlowsApi }}
        >
          <SuggestionRegistryProvider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: 'All',
                setSelectedTab: jest.fn(),
              }}
            >
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </SuggestionRegistryProvider>
        </VisibleFlowsContext.Provider>
      </EntitiesProvider>,
    );

    const idField = screen.getByRole('textbox', { name: 'Id' });
    act(() => {
      fireEvent.change(idField, { target: { value: newName } });
    });

    const closeSideBarButton = screen.getByTestId('close-side-bar');
    act(() => {
      fireEvent.click(closeSideBarButton);
    });

    expect(camelRouteVisualEntity.id).toEqual(newName);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'renameFlow', flowId, newName });
  });

  it('should allow consumers to update the Kamelet name', async () => {
    const kameletVisualEntity = new KameletVisualEntity(kameletJson);
    const flowId = kameletVisualEntity.id;
    const newName = 'MyNewName';
    const dispatchSpy = jest.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = FlowService.getFlowDiagram('test', kameletVisualEntity.toVizNode());
    selectedNode = nodes[nodes.length - 1];

    render(
      <EntitiesProvider>
        <VisibleFlowsContext.Provider
          value={{ visibleFlows: { [flowId]: true }, allFlowsVisible: true, visualFlowsApi }}
        >
          <SuggestionRegistryProvider>
            <CanvasFormTabsProvider>
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsProvider>
          </SuggestionRegistryProvider>
        </VisibleFlowsContext.Provider>
      </EntitiesProvider>,
    );

    const NameField = screen.getByDisplayValue('user-source');
    act(() => {
      fireEvent.change(NameField, { target: { value: newName } });
    });

    const closeSideBarButton = screen.getByTestId('close-side-bar');
    act(() => {
      fireEvent.click(closeSideBarButton);
    });

    expect(kameletVisualEntity.id).toEqual(newName);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'renameFlow', flowId, newName });
  });

  describe('should show the User-updated field under the modified tab', () => {
    beforeEach(() => {
      camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
      const { nodes } = FlowService.getFlowDiagram('test', camelRouteVisualEntity.toVizNode());
      selectedNode = nodes[0]; // timer
    });

    it('normal text field', async () => {
      render(
        <EntitiesProvider>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsProvider>
                <CanvasForm selectedNode={selectedNode} />
              </CanvasFormTabsProvider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesProvider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showModifiedFields();
      let variableReceiveField = formPageObject.getFieldByDisplayName('Variable Receive');
      expect(variableReceiveField).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      variableReceiveField = formPageObject.getFieldByDisplayName('Variable Receive');
      expect(variableReceiveField).toBeInTheDocument();

      await formPageObject.inputText('Variable Receive', 'myVariable');

      await formPageObject.showModifiedFields();
      variableReceiveField = formPageObject.getFieldByDisplayName('Variable Receive');
      expect(variableReceiveField).toBeInTheDocument();
      expect(variableReceiveField).toHaveAttribute('value', 'myVariable');
    });

    it('expression field', async () => {
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
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: setHeaderNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsProvider>
                <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
              </CanvasFormTabsProvider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showModifiedFields();
      let expressionField = formPageObject.getExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      expressionField = formPageObject.getExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).toBeInTheDocument();

      await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('simple');

      let inputExpression = formPageObject.getFieldByDisplayName('Expression');
      expect(inputExpression).toBeInTheDocument();

      await formPageObject.inputText('Expression', '${header.foo}');

      await formPageObject.showModifiedFields();
      expressionField = formPageObject.getExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).toBeInTheDocument();

      inputExpression = formPageObject.getFieldByDisplayName('Expression');
      expect(inputExpression).toBeInTheDocument();
    });

    it('dataformat field', async () => {
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
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: marshalNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsProvider>
                <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
              </CanvasFormTabsProvider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showModifiedFields();
      let dataformatField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      dataformatField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).toBeInTheDocument();

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('barcode');

      let inputBarcodeFormat = formPageObject.getFieldByDisplayName('Barcode Format');
      expect(inputBarcodeFormat).toBeInTheDocument();

      await formPageObject.inputText('Barcode Format', 'EAN-13');

      await formPageObject.showModifiedFields();
      dataformatField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).toBeInTheDocument();

      inputBarcodeFormat = formPageObject.getFieldByDisplayName('Barcode Format');
      expect(inputBarcodeFormat).toBeInTheDocument();
      expect(inputBarcodeFormat).toHaveAttribute('value', 'EAN-13');
    });

    it('loadbalancer field', async () => {
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
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: loadBalanceNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsProvider>
                <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
              </CanvasFormTabsProvider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showModifiedFields();
      let loadbalancerField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      loadbalancerField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).toBeInTheDocument();

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('failover load balancer');

      let inputRoundRobin = formPageObject.getFieldByDisplayName('Round Robin');
      expect(inputRoundRobin).toBeInTheDocument();

      await formPageObject.inputText('Round Robin', 'playoff');

      await formPageObject.showModifiedFields();
      loadbalancerField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).toBeInTheDocument();

      inputRoundRobin = formPageObject.getFieldByDisplayName('Round Robin');
      expect(inputRoundRobin).toBeInTheDocument();
      expect(inputRoundRobin).toHaveAttribute('value', 'playoff');
    });
  });

  describe('should show the Required field under the required tab', () => {
    beforeEach(() => {
      camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
      const { nodes } = FlowService.getFlowDiagram('test', camelRouteVisualEntity.toVizNode());
      selectedNode = nodes[0]; // timer
    });

    it('normal text field', async () => {
      render(
        <EntitiesProvider>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsProvider>
                <CanvasForm selectedNode={selectedNode} />
              </CanvasFormTabsProvider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesProvider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showRequiredFields();
      let timerNameField = formPageObject.getFieldByDisplayName('Timer Name');
      expect(timerNameField).toBeInTheDocument();

      await formPageObject.inputText('Timer Name', 'quartz');

      await formPageObject.showAllFields();
      timerNameField = formPageObject.getFieldByDisplayName('Timer Name');
      expect(timerNameField).toBeInTheDocument();
      expect(timerNameField).toHaveAttribute('value', 'quartz');
    });

    it('expression field', async () => {
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
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: setHeaderNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsProvider>
                <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
              </CanvasFormTabsProvider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showRequiredFields();
      let expressionField = formPageObject.getExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).toBeInTheDocument();

      await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('simple');

      let inputExpression = formPageObject.getFieldByDisplayName('Expression');
      expect(inputExpression).toBeInTheDocument();

      await formPageObject.inputText('Expression', '${header.foo}');

      await formPageObject.showAllFields();
      expressionField = formPageObject.getExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).toBeInTheDocument();

      inputExpression = formPageObject.getFieldByDisplayName('Expression');
      expect(inputExpression).toBeInTheDocument();
    });

    it('dataformat field', async () => {
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
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: marshalNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsProvider>
                <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
              </CanvasFormTabsProvider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showRequiredFields();
      let dataformatField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).toBeInTheDocument();

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('beanio');

      let inputBarcodeFormat = formPageObject.getFieldByDisplayName('Mapping');
      expect(inputBarcodeFormat).toBeInTheDocument();

      await formPageObject.inputText('Mapping', 'Jackson');

      await formPageObject.showAllFields();
      dataformatField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).toBeInTheDocument();

      inputBarcodeFormat = formPageObject.getFieldByDisplayName('Mapping');
      expect(inputBarcodeFormat).toBeInTheDocument();
      expect(inputBarcodeFormat).toHaveAttribute('value', 'Jackson');
    });

    it('loadbalancer field', async () => {
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
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: loadBalanceNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <SuggestionRegistryProvider>
              <CanvasFormTabsProvider>
                <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
              </CanvasFormTabsProvider>
            </SuggestionRegistryProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showRequiredFields();
      let loadbalancerField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).toBeInTheDocument();

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('weighted load balancer');

      let inputDistributionRatio = formPageObject.getFieldByDisplayName('Distribution Ratio');
      expect(inputDistributionRatio).toBeInTheDocument();

      await formPageObject.inputText('Distribution Ratio', '3.5');

      await formPageObject.showAllFields();
      loadbalancerField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).toBeInTheDocument();

      inputDistributionRatio = formPageObject.getFieldByDisplayName('Distribution Ratio');
      expect(inputDistributionRatio).toBeInTheDocument();
      expect(inputDistributionRatio).toHaveAttribute('value', '3.5');
    });
  });
});
