import {
  action,
  BaseEdge,
  BaseGraph,
  BaseNode,
  ElementContext,
  Point,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { act, render } from '@testing-library/react';
import React from 'react';

import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { createOverlayStore } from '../../../../store/overlay.store';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CanvasOverlayContext } from '../../Overlay/use-canvas-overlays';
import { CustomEdge } from './CustomEdge';

const mockRef = { current: null };
const dndState = vi.hoisted(() => ({
  droppable: false,
  hover: false,
  canDrop: false,
  dragItemType: undefined,
  dragItem: undefined,
}));

vi.mock('@patternfly/react-topology', async () => {
  const actual = await vi.importActual('@patternfly/react-topology');
  return {
    ...actual,
    Layer: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useDndDrop: () => [dndState, mockRef],
  };
});

describe('CustomEdge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    dndState.droppable = false;
  });

  it('should throw when element is not an Edge', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const nodeElement = new BaseNode();

    expect(() => {
      render(<CustomEdge element={nodeElement} />);
    }).toThrow('EdgeEndWithButton must be used only on Edge elements');
  });

  it('renders an edge and keeps its annotation on the frozen path while dragging', async () => {
    const vizNode = createVisualizationNode('route.from.steps.0.log', {
      name: 'log',
      path: 'route.from.steps.0.log',
      isPlaceholder: false,
      isGroup: false,
      title: '',
      description: '',
      iconUrl: '',
    }) as IVisualizationNode;
    vi.spyOn(vizNode, 'getNodeInteraction').mockReturnValue({
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
    vi.spyOn(targetNode, 'getData').mockReturnValue({ vizNode });

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
    element.setId('edge');
    const scope = { canvasId: 'canvas', documentId: 'route.yaml', modelRevision: '1' };
    const store = createOverlayStore({ scope, targets: [{ kind: 'edge', id: 'edge' }] });
    store
      .getState()
      .createOwner()!
      .replaceLayer(scope, 'metrics', [
        {
          id: 'metric',
          kind: 'annotation',
          target: { kind: 'edge', id: 'edge' },
          text: '42',
          interaction: { accessibleLabel: 'Message count' },
        },
      ]);
    const source = {
      store,
      model: {
        nodes: [
          { id: 'a', type: 'node' },
          { id: 'b', type: 'node' },
        ],
        edges: [{ id: 'edge', type: 'edge', source: 'a', target: 'b' }],
      },
    };

    const { Provider } = await TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CanvasOverlayContext.Provider value={source}>
              <CustomEdge element={element} />
            </CanvasOverlayContext.Provider>
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    const edge = document.querySelector('.custom-edge')!;
    expect(edge).toBeInTheDocument();
    const annotation = edge.querySelector('.kaoto-canvas-annotations')!;
    const before = [annotation.getAttribute('x'), annotation.getAttribute('y')];
    const path = edge.querySelector('.custom-edge__body')!.getAttribute('d');
    act(
      action(() => {
        dndState.droppable = true;
        element.setBendpoints([new Point(1000, 0)]);
      }),
    );
    expect(edge.querySelector('.custom-edge__body')).toHaveAttribute('d', path);
    expect([annotation.getAttribute('x'), annotation.getAttribute('y')]).toEqual(before);
  });
});
