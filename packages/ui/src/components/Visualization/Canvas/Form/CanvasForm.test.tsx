import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteDefinition } from '@kaoto/camel-catalog/types';
import { CanvasFormTabsContext, CanvasFormTabsProvider } from '@kaoto/forms';
import { KaotoFormPageObject } from '@kaoto/forms/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { CamelRouteVisualEntity, createVisualizationNode, KameletVisualEntity } from '../../../../models';
import { EntityType } from '../../../../models/entities';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { VisualFlowsApi } from '../../../../models/visualization/flows/support/flows-visibility';
import { camelRouteJson, kameletJson, TestProvidersWrapper } from '../../../../stubs';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../../stubs/test-load-catalog';
import { ROOT_PATH } from '../../../../utils';
import { FlowService } from '../flow.service';
import { CanvasForm } from './CanvasForm';

describe('CanvasForm', () => {
  let camelRouteVisualEntity: CamelRouteVisualEntity;
  let vizNode: IVisualizationNode;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  beforeEach(async () => {
    camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
    const { nodes } = FlowService.getFlowDiagram('test', await camelRouteVisualEntity.toVizNode());
    const choiceNode = nodes.find((node) => node.id === 'test|route.from.steps.1.choice')!;
    vizNode = choiceNode.data!.vizNode!;
    await vizNode.fetchSchema();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render', async () => {
    const { Provider } = await TestProvidersWrapper();
    const { container } = render(
      <Provider>
        <CanvasFormTabsProvider>
          <CanvasForm vizNode={vizNode} onClose={vi.fn()} />
        </CanvasFormTabsProvider>
      </Provider>,
    );

    await screen.findAllByRole('button', { name: 'All' });
    expect(container).toMatchSnapshot();
  });

  it('should render nothing if no schema is available', async () => {
    const noSchemaVizNode = createVisualizationNode('route', {
      name: EntityType.Route,
      path: CamelRouteVisualEntity.ROOT_PATH,
      entity: new CamelRouteVisualEntity(camelRouteJson),
      isGroup: true,
      processorName: 'route',
      iconUrl: '',
      title: 'route',
      description: '',
      isPlaceholder: false,
    });

    await noSchemaVizNode.fetchNodeDefinition();

    const { Provider } = await TestProvidersWrapper();
    const { container } = render(
      <Provider>
        <CanvasFormTabsProvider>
          <CanvasForm vizNode={noSchemaVizNode} onClose={vi.fn()} />
        </CanvasFormTabsProvider>
      </Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render nothing if no schema and no definition is available', async () => {
    const noSchemaVizNode = createVisualizationNode('route', {
      name: EntityType.Route,
      path: CamelRouteVisualEntity.ROOT_PATH,
      entity: new CamelRouteVisualEntity(camelRouteJson),
      isGroup: true,
      processorName: 'route',
      iconUrl: '',
      title: 'route',
      description: '',
      isPlaceholder: false,
    });

    (noSchemaVizNode as IVisualizationNode).fetchNodeDefinition = vi.fn().mockResolvedValue(null);
    const { Provider } = await TestProvidersWrapper();
    const { container } = render(
      <Provider>
        <CanvasFormTabsProvider>
          <CanvasForm vizNode={noSchemaVizNode} onClose={vi.fn()} />
        </CanvasFormTabsProvider>
      </Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it("should serialize empty strings `''` as `undefined`", async () => {
    const flowId = camelRouteVisualEntity.id;
    const dispatchSpy = vi.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = FlowService.getFlowDiagram('test', await camelRouteVisualEntity.toVizNode());
    const lastVizNode = nodes[nodes.length - 1].data!.vizNode!;
    await lastVizNode.fetchSchema();

    const { Provider } = await TestProvidersWrapper({
      visibleFlowsContext: { allFlowsVisible: true, visibleFlows: { [flowId]: true }, visualFlowsApi },
    });

    render(
      <Provider>
        <CanvasFormTabsContext.Provider
          value={{
            selectedTab: 'All',
            setSelectedTab: vi.fn(),
          }}
        >
          <CanvasForm vizNode={lastVizNode} onClose={vi.fn()} />
        </CanvasFormTabsContext.Provider>
      </Provider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Description', '');

    const closeSideBarButton = await screen.findByTestId('close-side-bar');
    fireEvent.click(closeSideBarButton);

    expect(camelRouteVisualEntity.entityDef.route.description).toBeUndefined();
  });

  it("should serialize empty strings(with space characters) `' '` as `undefined`", async () => {
    const flowId = camelRouteVisualEntity.id;
    const dispatchSpy = vi.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = FlowService.getFlowDiagram('test', await camelRouteVisualEntity.toVizNode());
    const lastVizNode = nodes[nodes.length - 1].data!.vizNode!;
    await lastVizNode.fetchSchema();

    const { Provider } = await TestProvidersWrapper({
      visibleFlowsContext: { allFlowsVisible: true, visibleFlows: { [flowId]: true }, visualFlowsApi },
    });

    render(
      <Provider>
        <CanvasFormTabsContext.Provider
          value={{
            selectedTab: 'All',
            setSelectedTab: vi.fn(),
          }}
        >
          <CanvasForm vizNode={lastVizNode} onClose={vi.fn()} />
        </CanvasFormTabsContext.Provider>
      </Provider>,
    );

    const formPageObject = new KaotoFormPageObject(screen, act);
    await formPageObject.inputText('Description', ' ');

    const closeSideBarButton = await screen.findByTestId('close-side-bar');
    fireEvent.click(closeSideBarButton);

    expect(camelRouteVisualEntity.entityDef.route.description).toBeUndefined();
  });

  it('should allow consumers to update the Camel Route ID', async () => {
    const flowId = camelRouteVisualEntity.id;
    const newName = 'MyNewId';
    const dispatchSpy = vi.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = FlowService.getFlowDiagram('test', await camelRouteVisualEntity.toVizNode());
    const lastVizNode = nodes[nodes.length - 1].data!.vizNode!;
    await lastVizNode.fetchSchema();

    const { Provider } = await TestProvidersWrapper({
      visibleFlowsContext: { allFlowsVisible: true, visibleFlows: { [flowId]: true }, visualFlowsApi },
    });

    render(
      <Provider>
        <CanvasFormTabsContext.Provider
          value={{
            selectedTab: 'All',
            setSelectedTab: vi.fn(),
          }}
        >
          <CanvasForm vizNode={lastVizNode} onClose={vi.fn()} />
        </CanvasFormTabsContext.Provider>
      </Provider>,
    );

    const idField = await screen.findByRole('textbox', { name: 'Id' });
    fireEvent.change(idField, { target: { value: newName } });

    const closeSideBarButton = await screen.findByTestId('close-side-bar');
    fireEvent.click(closeSideBarButton);

    expect(camelRouteVisualEntity.id).toEqual(newName);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'renameFlow', flowId, newName });
  });

  it('should allow consumers to update the Kamelet name', async () => {
    const kameletVisualEntity = new KameletVisualEntity(kameletJson);
    const flowId = kameletVisualEntity.id;
    const newName = 'MyNewName';
    const dispatchSpy = vi.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = FlowService.getFlowDiagram('test', await kameletVisualEntity.toVizNode());
    const lastVizNode = nodes[nodes.length - 1].data!.vizNode!;
    await lastVizNode.fetchSchema();
    await lastVizNode.fetchNodeDefinition();

    const { Provider } = await TestProvidersWrapper({
      visibleFlowsContext: { allFlowsVisible: true, visibleFlows: { [flowId]: true }, visualFlowsApi },
    });

    render(
      <Provider>
        <CanvasFormTabsProvider>
          <CanvasForm vizNode={lastVizNode} onClose={vi.fn()} />
        </CanvasFormTabsProvider>
      </Provider>,
    );

    const NameField = await screen.findByDisplayValue('user-source');
    fireEvent.change(NameField, { target: { value: newName } });

    const closeSideBarButton = await screen.findByTestId('close-side-bar');
    fireEvent.click(closeSideBarButton);

    expect(kameletVisualEntity.id).toEqual(newName);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'renameFlow', flowId, newName });
  });

  describe('should show the User-updated field under the modified tab', () => {
    beforeEach(async () => {
      camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
      const { nodes } = FlowService.getFlowDiagram('test', await camelRouteVisualEntity.toVizNode());
      vizNode = nodes[0].data!.vizNode!; // timer
      await vizNode.fetchSchema();
    });

    it('normal text field', async () => {
      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <CanvasFormTabsProvider>
            <CanvasForm vizNode={vizNode} onClose={vi.fn()} />
          </CanvasFormTabsProvider>
        </Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showModifiedFields();
      let variableReceiveField = formPageObject.getFieldByDisplayName('Variable Receive');
      expect(variableReceiveField).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      variableReceiveField = await formPageObject.findFieldByDisplayName('Variable Receive');
      expect(variableReceiveField).toBeInTheDocument();

      await formPageObject.inputText('Variable Receive', 'myVariable');

      await formPageObject.showModifiedFields();
      variableReceiveField = await formPageObject.findFieldByDisplayName('Variable Receive');
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
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const setHeaderVizNode = rootNode.getChildren()![1];
      await setHeaderVizNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <CanvasFormTabsProvider>
            <CanvasForm vizNode={setHeaderVizNode} onClose={vi.fn()} />
          </CanvasFormTabsProvider>
        </Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showModifiedFields();
      let expressionField = formPageObject.getExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      expressionField = await formPageObject.findExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).toBeInTheDocument();

      await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('simple');

      let inputExpression = await formPageObject.findFieldByDisplayName('Expression');
      expect(inputExpression).toBeInTheDocument();

      await formPageObject.inputText('Expression', '${header.foo}');

      await formPageObject.showModifiedFields();
      expressionField = await formPageObject.findExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).toBeInTheDocument();

      inputExpression = await formPageObject.findFieldByDisplayName('Expression');
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
      } as unknown as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const marshalVizNode = rootNode.getChildren()![1];
      await marshalVizNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <CanvasFormTabsProvider>
            <CanvasForm vizNode={marshalVizNode} onClose={vi.fn()} />
          </CanvasFormTabsProvider>
        </Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showModifiedFields();
      let dataformatField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      dataformatField = await formPageObject.findOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).toBeInTheDocument();

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('barcode');

      let inputBarcodeFormat = await formPageObject.findTypeaheadInputForProperty('#.barcode.barcodeFormat');
      expect(inputBarcodeFormat).toBeInTheDocument();

      await formPageObject.toggleTypeaheadFieldForProperty('#.barcode.barcodeFormat');
      await formPageObject.selectTypeaheadItem('ean_13');

      await formPageObject.showModifiedFields();
      dataformatField = await formPageObject.findOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).toBeInTheDocument();

      inputBarcodeFormat = await formPageObject.findTypeaheadInputForProperty('#.barcode.barcodeFormat');
      expect(inputBarcodeFormat).toBeInTheDocument();
      expect(inputBarcodeFormat).toHaveAttribute('value', 'EAN_13');
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
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const loadBalanceVizNode = rootNode.getChildren()![1];
      await loadBalanceVizNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <CanvasFormTabsProvider>
            <CanvasForm vizNode={loadBalanceVizNode} onClose={vi.fn()} />
          </CanvasFormTabsProvider>
        </Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showModifiedFields();
      let loadbalancerField = formPageObject.getOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).not.toBeInTheDocument();

      await formPageObject.showAllFields();
      loadbalancerField = await formPageObject.findOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).toBeInTheDocument();

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('failover load balancer');

      let inputRoundRobin = await screen.findByLabelText('Round Robin');
      expect(inputRoundRobin).toBeInTheDocument();

      fireEvent.click(inputRoundRobin);

      await formPageObject.showModifiedFields();
      loadbalancerField = await formPageObject.findOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).toBeInTheDocument();

      inputRoundRobin = await screen.findByLabelText('Round Robin');
      expect(inputRoundRobin).toBeInTheDocument();
      expect(inputRoundRobin).toBeChecked();
    });
  });

  describe('should show the Required field under the required tab', () => {
    beforeEach(async () => {
      camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
      const { nodes } = FlowService.getFlowDiagram('test', await camelRouteVisualEntity.toVizNode());
      vizNode = nodes[0].data!.vizNode!; // timer
      await vizNode.fetchSchema();
    });

    it('normal text field', async () => {
      const { Provider } = await TestProvidersWrapper();

      // The form opens on the Required tab by default, which means showRequiredFields()
      // would be a no-op click that provides no re-render to flush the Suspense boundary
      // inside MultiValuePropertyEditor. Wrapping render in act() drains all pending
      // microtasks (including the DynamicCatalogRegistry promise) before asserting.
      // eslint-disable-next-line testing-library/no-unnecessary-act
      await act(async () => {
        render(
          <Provider>
            <CanvasFormTabsProvider>
              <CanvasForm vizNode={vizNode} onClose={vi.fn()} />
            </CanvasFormTabsProvider>
          </Provider>,
        );
      });

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showRequiredFields();
      let timerNameField = await formPageObject.findFieldByDisplayName('Timer Name');
      expect(timerNameField).toBeInTheDocument();

      await formPageObject.inputText('Timer Name', 'quartz');

      await formPageObject.showAllFields();
      timerNameField = await formPageObject.findFieldByDisplayName('Timer Name');
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
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const setHeaderVizNode = rootNode.getChildren()![1];
      await setHeaderVizNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      // The expression selector suspends while language names load.
      // eslint-disable-next-line testing-library/no-unnecessary-act
      await act(async () => {
        render(
          <Provider>
            <CanvasFormTabsProvider>
              <CanvasForm vizNode={setHeaderVizNode} onClose={vi.fn()} />
            </CanvasFormTabsProvider>
          </Provider>,
        );
      });

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showRequiredFields();
      let expressionField = await formPageObject.findExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).toBeInTheDocument();

      await formPageObject.toggleExpressionFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('simple');

      let inputExpression = await formPageObject.findFieldByDisplayName('Expression');
      expect(inputExpression).toBeInTheDocument();

      await formPageObject.inputText('Expression', '${header.foo}');

      await formPageObject.showAllFields();
      expressionField = await formPageObject.findExpressionInputForProperty(ROOT_PATH);
      expect(expressionField).toBeInTheDocument();

      inputExpression = await formPageObject.findFieldByDisplayName('Expression');
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
      } as unknown as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const marshalVizNode = rootNode.getChildren()![1];
      await marshalVizNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <CanvasFormTabsProvider>
            <CanvasForm vizNode={marshalVizNode} onClose={vi.fn()} />
          </CanvasFormTabsProvider>
        </Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showRequiredFields();
      let dataformatField = await formPageObject.findOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).toBeInTheDocument();

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('beanio');

      let inputBarcodeFormat = await formPageObject.findFieldByDisplayName('Mapping');
      expect(inputBarcodeFormat).toBeInTheDocument();

      await formPageObject.inputText('Mapping', 'Jackson');

      await formPageObject.showAllFields();
      dataformatField = await formPageObject.findOneOfInputForProperty(ROOT_PATH);
      expect(dataformatField).toBeInTheDocument();

      inputBarcodeFormat = await formPageObject.findFieldByDisplayName('Mapping');
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
      const rootNode: IVisualizationNode = await entity.toVizNode();
      const loadBalanceVizNode = rootNode.getChildren()![1];
      await loadBalanceVizNode.fetchSchema();

      const { Provider } = await TestProvidersWrapper();

      render(
        <Provider>
          <CanvasFormTabsProvider>
            <CanvasForm vizNode={loadBalanceVizNode} onClose={vi.fn()} />
          </CanvasFormTabsProvider>
        </Provider>,
      );

      const formPageObject = new KaotoFormPageObject(screen, act);

      await formPageObject.showRequiredFields();
      let loadbalancerField = await formPageObject.findOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).toBeInTheDocument();

      await formPageObject.toggleOneOfFieldForProperty(ROOT_PATH);
      await formPageObject.selectTypeaheadItem('weighted load balancer');

      let inputDistributionRatio = await formPageObject.findFieldByDisplayName('Distribution Ratio');
      expect(inputDistributionRatio).toBeInTheDocument();

      await formPageObject.inputText('Distribution Ratio', '3.5');

      await formPageObject.showAllFields();
      loadbalancerField = await formPageObject.findOneOfInputForProperty(ROOT_PATH);
      expect(loadbalancerField).toBeInTheDocument();

      inputDistributionRatio = await formPageObject.findFieldByDisplayName('Distribution Ratio');
      expect(inputDistributionRatio).toBeInTheDocument();
      expect(inputDistributionRatio).toHaveAttribute('value', '3.5');
    });
  });
});
