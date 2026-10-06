import {
  action,
  BaseEdge,
  BaseGraph,
  BaseNode,
  ElementContext,
  DndManager,
  DndStore,
  Point,
  VisualizationProvider,
} from '@patternfly/react-topology';
import { act, render } from '@testing-library/react';

import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { NODE_DRAG_TYPE } from '../customComponentUtils';
import { CustomEdge } from './CustomEdge';

describe('CustomEdge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
    element.setData({
      overlays: [
        {
          key: 'metric',
          entry: {
            id: 'metric',
            kind: 'annotation',
            target: { kind: 'edge', id: 'edge' },
            text: '42',
            interaction: { accessibleLabel: 'Message count' },
          },
        },
      ],
    });

    const { Provider } = await TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomEdge element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    const edge = document.querySelector('.custom-edge')!;
    expect(edge).toBeInTheDocument();
    const annotation = edge.querySelector('.kaoto-canvas-annotations')!;
    const before = [annotation.getAttribute('x'), annotation.getAttribute('y')];
    const path = edge.querySelector('.custom-edge__body')!.getAttribute('d');
    const manager: DndManager = controller.getStore<DndStore>().dndManager;
    const [source] = manager.registerSource({
      type: NODE_DRAG_TYPE,
      canDrag: () => true,
      beginDrag: () => sourceNode,
      drag: () => {},
      endDrag: () => {},
      canCancel: () => true,
    });
    act(
      action(() => {
        manager.beginDrag(source, undefined, 10, 10, 10, 10);
        element.setBendpoints([new Point(1000, 0)]);
      }),
    );
    expect(edge.querySelector('.custom-edge__body')).toHaveAttribute('d', path);
    expect([annotation.getAttribute('x'), annotation.getAttribute('y')]).toEqual(before);
    await act(async () => {
      manager.cancel();
      await manager.endDrag();
    });
  });
});
