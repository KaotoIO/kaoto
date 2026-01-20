import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render } from '@testing-library/react';
import React from 'react';

import { CatalogKind, createVisualizationNode, IVisualizationNode } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomEdge } from './CustomEdge';

const mockRef = { current: null };

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return {
    ...actual,
    Layer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
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
  };
});

describe('CustomEdge', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw when element is not an Edge', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const nodeElement = new BaseNode();

    expect(() => {
      act(() => {
        render(<CustomEdge element={nodeElement} />);
      });
    }).toThrow('EdgeEndWithButton must be used only on Edge elements');
  });

  it('should render edge with custom-edge class when edge is valid', () => {
    const vizNode = createVisualizationNode('route.from.steps.0.log', {
      catalogKind: CatalogKind.Component,
      name: 'log',
      path: 'route.from.steps.0.log',
    }) as IVisualizationNode;
    jest.spyOn(vizNode, 'getNodeInteraction').mockReturnValue({
      canHavePreviousStep: true,
      canHaveNextStep: true,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canReplaceStep: false,
      canRemoveStep: false,
      canRemoveFlow: false,
      canBeDisabled: false,
    });

    const parentElement = new BaseGraph();
    const sourceNode = new BaseNode();
    const targetNode = new BaseNode();
    sourceNode.setParent(parentElement);
    targetNode.setParent(parentElement);
    jest.spyOn(targetNode, 'getData').mockReturnValue({ vizNode });

    const element = new BaseEdge();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    sourceNode.setController(controller);
    targetNode.setController(controller);
    element.setSource(sourceNode);
    element.setTarget(targetNode);
    element.setController(controller);
    element.setParent(parentElement);
    element.setStartPoint(0, 0);
    element.setEndPoint(100, 100);

    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomEdge element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(document.querySelector('.custom-edge')).toBeInTheDocument();
  });
});
