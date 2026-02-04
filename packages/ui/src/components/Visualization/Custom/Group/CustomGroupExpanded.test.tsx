import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { CatalogKind, createVisualizationNode, IVisualizationNode } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomGroupExpanded } from './CustomGroupExpanded';

const mockRef = { current: null };

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return {
    ...actual,
    Layer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useDragNode: () => [{ node: undefined, dragEvent: undefined }, mockRef],
    useDndDrop: () => [{ droppable: false, hover: false, canDrop: false }, mockRef],
    useAnchor: () => {},
    useHover: () => [false, mockRef],
  };
});

jest.mock('../../../../hooks/processor-icon.hook', () => ({
  useProcessorIcon: () => ({ Icon: null, description: '' }),
}));

describe('CustomGroupExpanded', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw when element is not a Node', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<CustomGroupExpanded element={edgeElement} />);
      });
    }).toThrow('CustomGroupExpanded must be used only on Node elements');
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
            <CustomGroupExpanded element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render group container with data-testid when vizNode is provided', () => {
    const vizNode = createVisualizationNode('choice-1', {
      catalogKind: CatalogKind.Processor,
      name: 'choice',
      path: 'route.from.steps.0.choice',
    }) as IVisualizationNode;
    jest.spyOn(vizNode, 'getNodeLabel').mockReturnValue('Choice');
    jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getNodeValidationText').mockReturnValue(undefined);
    jest.spyOn(vizNode, 'getTooltipContent').mockReturnValue('Choice');

    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    jest.spyOn(element, 'getData').mockReturnValue({ vizNode });
    jest.spyOn(element, 'getAllNodeChildren').mockReturnValue([]);
    jest.spyOn(element, 'getId').mockReturnValue('node-choice-1');

    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomGroupExpanded element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    const group = screen.getByTestId('custom-group__choice-1');
    expect(group).toBeInTheDocument();
    expect(group).toHaveAttribute('data-grouplabel', 'Choice');
  });
});
