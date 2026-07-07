import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomNodeObserver } from './CustomNode';

const mockRef = { current: null };

vi.mock('@patternfly/react-topology', async () => {
  const actual = await vi.importActual('@patternfly/react-topology');
  return {
    ...actual,
    Layer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useDragNode: () => [{ node: undefined }, mockRef],
    useDndDrop: () => [
      {
        droppable: false,
        hover: false,
        canDrop: false,
        dragItemType: undefined,
        dragItem: undefined,
      },
      mockRef,
    ],
    useAnchor: () => {},
    useHover: () => [false, mockRef],
  };
});

vi.mock('../../../../utils/processor-icon', () => ({
  getProcessorIcon: () => null,
}));

describe('CustomNode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw when element is not a Node', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<CustomNodeObserver element={edgeElement} />);
      });
    }).toThrow('CustomNode must be used only on Node elements');
  });

  it('should return null when element has no vizNode in data', async () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    vi.spyOn(element, 'getData').mockReturnValue({});

    const { Provider } = await TestProvidersWrapper();

    const { container } = render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomNodeObserver element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(container.querySelector('[data-testid^="custom-node__"]')).not.toBeInTheDocument();
  });

  it('should render node container with label from vizNode', async () => {
    const vizNode = createVisualizationNode('route.from.steps.0.log', {
      name: 'log',
      path: 'route.from.steps.0.log',
      isPlaceholder: false,
      isGroup: false,
      title: '',
      description: '',
      iconUrl: '',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeLabel').mockReturnValue('log');
    vi.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    vi.spyOn(vizNode, 'getNodeValidationText').mockResolvedValue(undefined);
    vi.spyOn(vizNode, 'canDragNode').mockReturnValue(false);
    vi.spyOn(vizNode, 'canDropOnNode').mockReturnValue(false);

    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    vi.spyOn(element, 'getData').mockReturnValue({ vizNode });
    vi.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    vi.spyOn(element, 'getId').mockReturnValue('node-log');

    const { Provider } = await TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomNodeObserver element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    const node = screen.getByTestId('custom-node__route.from.steps.0.log');
    expect(node).toBeInTheDocument();
    expect(node).toHaveAttribute('data-nodelabel', 'log');
  });

  it('should return null when vizNode is undefined', async () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    // Do NOT set vizNode in element data - it will be undefined

    const { Provider } = await TestProvidersWrapper();

    const { container } = render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomNodeObserver element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    // The component should return null, resulting in empty render
    expect(container.querySelector('.custom-node')).toBeNull();
  });
});
