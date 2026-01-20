import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { CatalogKind, createVisualizationNode, IVisualizationNode, IVisualizationNodeData } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { PlaceholderNode, PlaceholderNodeObserver } from './PlaceholderNode';

const mockRef = { current: null };

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return {
    ...actual,
    Layer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useDndDrop: () => [
      { droppable: false, hover: false, canDrop: false, dragItemType: undefined, dragItem: undefined },
      mockRef,
    ],
    useAnchor: () => {},
  };
});

jest.mock('../hooks/replace-step.hook', () => ({
  useReplaceStep: () => ({ onReplaceNode: jest.fn() }),
}));

const mockOnReplaceNode = jest.fn();
const mockOnInsertStep = jest.fn();

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return {
    ...actual,
    Layer: ({ children }: { children: React.ReactNode }) => <g data-testid="mock-layer">{children}</g>,
    useAnchor: jest.fn(),
    useDndDrop: jest.fn(() => [{ droppable: false, hover: false, canDrop: false }, jest.fn()]),
  };
});

jest.mock('../hooks/replace-step.hook', () => ({
  useReplaceStep: jest.fn(() => ({ onReplaceNode: mockOnReplaceNode })),
}));

jest.mock('../hooks/insert-step.hook', () => ({
  useInsertStep: jest.fn(() => ({ onInsertStep: mockOnInsertStep })),
}));

describe('PlaceholderNode', () => {
  beforeEach(() => {
    mockOnReplaceNode.mockClear();
    mockOnInsertStep.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw when element is not a Node', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<PlaceholderNodeObserver element={edgeElement} />);
      });
    }).toThrow('PlaceholderNode must be used only on Node elements');
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
            <PlaceholderNode element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(container.querySelector('[data-testid^="placeholder-node__"]')).not.toBeInTheDocument();
  });

  it('should render placeholder container with data-testid when vizNode is provided', () => {
    const vizNode = createVisualizationNode('route.from.steps.1.placeholder', {
      catalogKind: CatalogKind.Processor,
      name: 'placeholder',
      path: 'route.from.steps.1.placeholder',
      isPlaceholder: true,
    }) as IVisualizationNode;
    jest.spyOn(vizNode, 'getNodeLabel').mockReturnValue('placeholder');
    jest.spyOn(vizNode, 'getId').mockReturnValue('route-1234');

    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    jest.spyOn(element, 'getData').mockReturnValue({ vizNode });
    jest.spyOn(element, 'getId').mockReturnValue('node-placeholder');

    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <PlaceholderNode element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(screen.getByTestId('placeholder-node__route.from.steps.1.placeholder')).toBeInTheDocument();
    expect(screen.getByTitle('Add step')).toBeInTheDocument();
  });

  describe('isSpecialChildPlaceholder', () => {
    const setupWithVizNode = (vizNodeData: Partial<IVisualizationNodeData>) => {
      const parentElement = new BaseGraph();
      const element = new BaseNode();
      const controller = ControllerService.createController();
      parentElement.setController(controller);
      element.setController(controller);
      element.setParent(parentElement);

      const vizNode = createVisualizationNode('test-placeholder', {
        path: 'test.placeholder',
        isPlaceholder: true,
        ...vizNodeData,
      } as IVisualizationNodeData);

      element.setData({ vizNode });

      const { Provider } = TestProvidersWrapper();

      return render(
        <Provider>
          <VisualizationProvider controller={controller}>
            <ElementContext.Provider value={element}>
              <PlaceholderNodeObserver element={element} />
            </ElementContext.Provider>
          </VisualizationProvider>
        </Provider>,
      );
    };

    it('should render CodeBranchIcon for special child placeholder', () => {
      const wrapper = setupWithVizNode({ name: 'placeholder-special-child' });

      // CodeBranchIcon has a specific path, check for its presence via SVG content
      const svgIcon = wrapper.container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should render PlusCircleIcon for regular placeholder', () => {
      const wrapper = setupWithVizNode({ name: 'placeholder' });

      const svgIcon = wrapper.container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(wrapper.asFragment()).toMatchSnapshot();
    });

    it('should call onInsertStep when clicking on special child placeholder', () => {
      setupWithVizNode({ name: 'placeholder-special-child' });

      const placeholderNode = screen.getByTestId('placeholder-node__test-placeholder');
      fireEvent.click(placeholderNode);

      expect(mockOnInsertStep).toHaveBeenCalledTimes(1);
      expect(mockOnReplaceNode).not.toHaveBeenCalled();
    });

    it('should call onReplaceNode when clicking on regular placeholder', () => {
      setupWithVizNode({ name: 'placeholder' });

      const placeholderNode = screen.getByTestId('placeholder-node__test-placeholder');
      fireEvent.click(placeholderNode);

      expect(mockOnReplaceNode).toHaveBeenCalledTimes(1);
      expect(mockOnInsertStep).not.toHaveBeenCalled();
    });
  });
});
