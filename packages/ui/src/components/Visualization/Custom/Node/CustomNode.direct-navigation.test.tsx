import { BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { fireEvent, render, screen } from '@testing-library/react';

import { CatalogKind, IVisualizationNode } from '../../../../models';
import { DirectRouteNavigationService } from '../../../../models/camel/direct-route-navigation.service';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { DirectRouteNavigationAnchor } from './DirectRouteNavigationAnchor';

describe('DirectRouteNavigationAnchor', () => {
  const createMockVizNode = (processorName: string): IVisualizationNode =>
    ({
      id: 'route-target',
      lastUpdate: 1,
      data: {
        catalogKind: CatalogKind.Component,
        name: 'to',
        path: 'route.from.steps.0.to',
        processorName,
        componentName: 'direct',
      },
      getId: () => 'route-target',
      getNodeLabel: () => 'Label',
      getTooltipContent: () => undefined,
      getNodeValidationText: () => undefined,
      canDragNode: () => false,
      getNodeDefinition: () => ({ uri: 'direct:addPet' }),
      getNodeInteraction: () => ({
        canBeDisabled: false,
        canHaveChildren: false,
        canHaveNextStep: false,
        canHavePreviousStep: false,
        canHaveSpecialChildren: false,
        canRemoveFlow: false,
        canRemoveStep: false,
        canReplaceStep: false,
      }),
    }) as unknown as IVisualizationNode;

  const renderNode = (
    vizNode: IVisualizationNode,
    visibleFlowsContext?: {
      visibleFlows: Record<string, boolean>;
      visualFlowsApi: { showFlows: (flowIds?: string[]) => void };
    },
  ) => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    element.setData({ vizNode });

    const { Provider } = TestProvidersWrapper(
      visibleFlowsContext
        ? {
            visibleFlowsContext: {
              allFlowsVisible: false,
              visibleFlows: visibleFlowsContext.visibleFlows,
              visualFlowsApi: visibleFlowsContext.visualFlowsApi,
            } as never,
          }
        : {},
    );

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <DirectRouteNavigationAnchor vizNode={vizNode} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    return { controller };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });
    jest.spyOn(DirectRouteNavigationService.prototype, 'getDirectEndpointNameFromDefinition').mockReturnValue('addPet');
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectConsumerRouteId').mockReturnValue(undefined);
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectConsumerNodeId').mockReturnValue(undefined);
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectCallerRouteIds').mockReturnValue([]);
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectCallerNodeId').mockReturnValue(undefined);
  });

  it('should provide single-route navigation for direct to nodes', () => {
    const showFlows = jest.fn();
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectConsumerRouteId').mockReturnValue('route-1');
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectConsumerNodeId').mockReturnValue('target-node-1');

    const { controller } = renderNode(createMockVizNode('to'), {
      visibleFlows: { 'route-1': true },
      visualFlowsApi: { showFlows },
    });
    jest
      .spyOn(controller, 'getNodeById')
      .mockImplementation((id) => (id === 'route-1|target-node-1' ? ({} as never) : undefined));
    const fireEventSpy = jest.spyOn(controller, 'fireEvent');

    fireEvent.click(screen.getByTestId('goto-route-btn'));

    expect(showFlows).not.toHaveBeenCalled();
    expect(fireEventSpy).toHaveBeenCalledWith('selection', ['route-1|target-node-1']);
  });

  it('should provide route options for direct from nodes with multiple callers', async () => {
    const showFlows = jest.fn();
    jest
      .spyOn(DirectRouteNavigationService.prototype, 'findDirectCallerRouteIds')
      .mockReturnValue(['route-1', 'route-2']);
    jest
      .spyOn(DirectRouteNavigationService.prototype, 'findDirectCallerNodeId')
      .mockImplementation((routeId) => `target-node-${routeId}`);

    const { controller } = renderNode(createMockVizNode('from'), {
      visibleFlows: { 'route-1': true, 'route-2': false },
      visualFlowsApi: { showFlows },
    });
    jest
      .spyOn(controller, 'getNodeById')
      .mockImplementation((id) => (id === 'route-2|target-node-route-2' ? ({} as never) : undefined));
    const fireEventSpy = jest.spyOn(controller, 'fireEvent');

    fireEvent.click(screen.getByTestId('goto-route-btn'));
    fireEvent.click(await screen.findByTestId('goto-route-option-route-2'));

    expect(showFlows).toHaveBeenCalledWith(['route-2']);
    expect(fireEventSpy).toHaveBeenCalledWith('selection', ['route-2|target-node-route-2']);
  });

  it('should skip navigation when direct endpoint name is not resolved', () => {
    jest
      .spyOn(DirectRouteNavigationService.prototype, 'getDirectEndpointNameFromDefinition')
      .mockReturnValue(undefined);

    renderNode(createMockVizNode('to'));

    expect(screen.queryByTestId('goto-route-btn')).not.toBeInTheDocument();
    expect(DirectRouteNavigationService.prototype.findDirectConsumerRouteId).not.toHaveBeenCalled();
    expect(DirectRouteNavigationService.prototype.findDirectCallerRouteIds).not.toHaveBeenCalled();
  });

  it('should fallback to canvas node discovery when precomputed target id is stale', () => {
    const showFlows = jest.fn();
    const raised = jest.fn();
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectConsumerRouteId').mockReturnValue('route-1');
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectConsumerNodeId').mockReturnValue('route-1');

    const { controller } = renderNode(createMockVizNode('to'), {
      visibleFlows: { 'route-1': true },
      visualFlowsApi: { showFlows },
    });

    const fallbackTargetNode = new BaseNode();
    fallbackTargetNode.setController(controller);
    fallbackTargetNode.setId('route-1|fallback-target');
    fallbackTargetNode.setData({
      vizNode: {
        data: { processorName: 'from', componentName: 'direct' },
        getNodeDefinition: () => ({ uri: 'direct:addPet' }),
      },
    });
    (fallbackTargetNode as unknown as { raise: () => void }).raise = raised;

    jest.spyOn(controller, 'getElements').mockReturnValue([fallbackTargetNode]);
    jest.spyOn(controller, 'getNodeById').mockImplementation((id) => {
      if (id === 'route-1|fallback-target') {
        return fallbackTargetNode as never;
      }
      return undefined;
    });
    const fireEventSpy = jest.spyOn(controller, 'fireEvent');

    fireEvent.click(screen.getByTestId('goto-route-btn'));

    expect(raised).toHaveBeenCalledTimes(1);
    expect(showFlows).not.toHaveBeenCalled();
    expect(fireEventSpy).toHaveBeenCalledWith('selection', ['route-1|fallback-target']);
  });

  it('should not fire selection when no target node can be resolved', () => {
    const showFlows = jest.fn();
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectConsumerRouteId').mockReturnValue('route-1');
    jest.spyOn(DirectRouteNavigationService.prototype, 'findDirectConsumerNodeId').mockReturnValue('route-1');

    const { controller } = renderNode(createMockVizNode('to'), {
      visibleFlows: { 'route-1': false },
      visualFlowsApi: { showFlows },
    });
    jest.spyOn(controller, 'getElements').mockReturnValue([]);
    jest.spyOn(controller, 'getNodeById').mockReturnValue(undefined);
    const fireEventSpy = jest.spyOn(controller, 'fireEvent');

    fireEvent.click(screen.getByTestId('goto-route-btn'));

    expect(showFlows).toHaveBeenCalledWith(['route-1']);
    expect(fireEventSpy).not.toHaveBeenCalledWith('selection', expect.anything());
  });
});
