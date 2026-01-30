import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { createVisualizationNode, IVisualizationNodeData } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { PlaceholderNodeObserver } from './PlaceholderNode';

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

  it('should throw an error if not used on Node elements', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<PlaceholderNodeObserver element={edgeElement} />);
      });
    }).toThrow('PlaceholderNode must be used only on Node elements');
  });

  it('should render without error', () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);

    const { Provider } = TestProvidersWrapper();

    const wrapper = render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <PlaceholderNodeObserver element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
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
