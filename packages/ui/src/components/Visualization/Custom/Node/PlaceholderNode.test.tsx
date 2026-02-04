import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';
import React from 'react';

import { CatalogKind, createVisualizationNode, IVisualizationNode } from '../../../../models';
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

describe('PlaceholderNode', () => {
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
});
