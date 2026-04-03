import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { CatalogKind, createVisualizationNode, IVisualizationNode } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomNodeObserver } from './CustomNode';

const mockRef = { current: null };

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
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

jest.mock('../../../../hooks/processor-icon.hook', () => ({
  useProcessorIcon: () => ({ Icon: null, description: '' }),
}));

describe('CustomNode', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw when element is not a Node', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<CustomNodeObserver element={edgeElement} />);
      });
    }).toThrow('CustomNode must be used only on Node elements');
  });

  it('should return null when element has no vizNode in data', () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    jest.spyOn(element, 'getData').mockReturnValue({});

    const { Provider } = TestProvidersWrapper();

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

  it('should render node container with label from vizNode', () => {
    const vizNode = createVisualizationNode('route.from.steps.0.log', {
      catalogKind: CatalogKind.Component,
      name: 'log',
      path: 'route.from.steps.0.log',
    }) as IVisualizationNode;
    jest.spyOn(vizNode, 'getNodeLabel').mockReturnValue('log');
    jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getNodeValidationText').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getTooltipContent').mockReturnValue('Log');
    jest.spyOn(vizNode, 'canDragNode').mockReturnValue(false);
    jest.spyOn(vizNode, 'canDropOnNode').mockReturnValue(false);

    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    jest.spyOn(element, 'getData').mockReturnValue({ vizNode });
    jest.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    jest.spyOn(element, 'getId').mockReturnValue('node-log');

    const { Provider } = TestProvidersWrapper();

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

  it('should return null when vizNode is undefined', () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    // Do NOT set vizNode in element data - it will be undefined

    const { Provider } = TestProvidersWrapper();

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

  it('should allow editing description on double-click of node label', () => {
    const vizNode = createVisualizationNode('route.from.steps.0.log', {
      catalogKind: CatalogKind.Component,
      name: 'log',
      path: 'route.from.steps.0.log',
    }) as IVisualizationNode;

    jest.spyOn(vizNode, 'getNodeLabel').mockReturnValue('log');
    jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue({ log: { message: 'test' } });
    jest.spyOn(vizNode, 'getNodeValidationText').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getTooltipContent').mockReturnValue('Log');
    jest.spyOn(vizNode, 'canDragNode').mockReturnValue(false);
    jest.spyOn(vizNode, 'canDropOnNode').mockReturnValue(false);
    const updateModelSpy = jest.spyOn(vizNode, 'updateModel');

    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    jest.spyOn(element, 'getData').mockReturnValue({ vizNode });
    jest.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    jest.spyOn(element, 'getId').mockReturnValue('node-log');

    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomNodeObserver element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    const labelElement = screen.getByText('log');
    expect(labelElement).toBeInTheDocument();

    // Double-click on the label
    act(() => {
      fireEvent.doubleClick(labelElement);
    });

    // Should show an input field for editing
    const input = screen.queryByRole('textbox');
    expect(input).toBeInTheDocument();

    // Type a new description
    if (input) {
      act(() => {
        fireEvent.change(input, { target: { value: 'My custom log description' } });
      });

      // Press Enter to save
      act(() => {
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      // Should call updateModel with the new description
      expect(updateModelSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'My custom log description',
        }),
      );
    }
  });
});
