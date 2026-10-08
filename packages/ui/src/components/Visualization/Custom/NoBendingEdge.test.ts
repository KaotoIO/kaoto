import { EdgeModel, NodeModel, Point, Visualization } from '@patternfly/react-topology';

import { LayoutType } from '../Canvas/canvas.models';
import { ControllerService } from '../Canvas/controller.service';
import { NoBendpointsEdge } from './NoBendingEdge';

describe('NoBendpointsEdge', () => {
  let edge: NoBendpointsEdge;

  /** Position and size of the element the self-loop edge is attached to */
  const PARENT_POSITION = { x: 10, y: 20 };
  const PARENT_SIZE = { width: 100, height: 50 };

  /**
   * Builds a real graph holding a self-loop edge on `node-1`.
   * - `group` parent: `node-1` lives inside a collapsed group, so the edge is anchored to that group
   * - `node` parent: `node-1` is a top-level node, so the edge is anchored to the node itself
   */
  const setupSelfLoop = (layout: LayoutType, parentType: 'group' | 'node') => {
    const controller: Visualization = ControllerService.createController();
    const boundaries = { ...PARENT_POSITION, ...PARENT_SIZE };

    const nodes: NodeModel[] =
      parentType === 'group'
        ? [
            { id: 'group-1', type: 'group', group: true, collapsed: true, children: ['node-1'], ...boundaries },
            /* A collapsed group is centered on its children, so the child shares the group boundaries */
            { id: 'node-1', type: 'node', ...boundaries },
          ]
        : [{ id: 'node-1', type: 'node', ...boundaries }];
    const edges: EdgeModel[] = [{ id: 'edge-1', type: 'edge', source: 'node-1', target: 'node-1' }];

    controller.fromModel({ graph: { id: 'g1', type: 'graph', layout }, nodes, edges }, false);

    const selfLoopEdge = controller.getEdgeById('edge-1');
    if (!(selfLoopEdge instanceof NoBendpointsEdge)) {
      throw new Error('The controller should create NoBendpointsEdge edges');
    }
    edge = selfLoopEdge;
  };

  beforeEach(() => {
    edge = new NoBendpointsEdge();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty bendpoints', () => {
    expect(edge.getBendpoints()).toEqual([]);
  });

  describe('getStartPoint - self-loop', () => {
    it('horizontal layout, group parent: center-top', () => {
      setupSelfLoop(LayoutType.DagreHorizontal, 'group');
      const point = edge.getStartPoint();
      expect(point).toEqual(new Point(10 + 100 / 2, 20));
    });

    it('horizontal layout, non-group parent: right-center', () => {
      setupSelfLoop(LayoutType.DagreHorizontal, 'node');
      const point = edge.getStartPoint();
      expect(point).toEqual(new Point(10 + 100, 20 + 50 / 2));
    });

    it('vertical layout, group parent: left-center', () => {
      setupSelfLoop(LayoutType.DagreVertical, 'group');
      const point = edge.getStartPoint();
      expect(point).toEqual(new Point(10, 20 + 50 / 2));
    });

    it('vertical layout, non-group parent: center-bottom', () => {
      setupSelfLoop(LayoutType.DagreVertical, 'node');
      const point = edge.getStartPoint();
      expect(point).toEqual(new Point(10 + 100 / 2, 20 + 50));
    });
  });

  describe('getEndPoint - self-loop', () => {
    it('horizontal layout, group parent: offset center-top', () => {
      setupSelfLoop(LayoutType.DagreHorizontal, 'group');
      const point = edge.getEndPoint();
      expect(point).toEqual(new Point(10 + 100 / 2 + 15, 20));
    });

    it('horizontal layout, non-group parent: offset center', () => {
      setupSelfLoop(LayoutType.DagreHorizontal, 'node');
      const point = edge.getEndPoint();
      expect(point).toEqual(new Point(10 + 100 / 2 + 55, 20 + 50 / 2));
    });

    it('vertical layout, group parent: left offset-center', () => {
      setupSelfLoop(LayoutType.DagreVertical, 'group');
      const point = edge.getEndPoint();
      expect(point).toEqual(new Point(10, 20 + 50 / 2 + 15));
    });

    it('vertical layout, non-group parent: center offset-bottom', () => {
      setupSelfLoop(LayoutType.DagreVertical, 'node');
      const point = edge.getEndPoint();
      expect(point).toEqual(new Point(10 + 100 / 2, 20 + 50 / 2 + 85));
    });
  });

  describe('non-self-loop', () => {
    const setupEdge = () => {
      const controller = ControllerService.createController();
      controller.fromModel(
        {
          graph: { id: 'g1', type: 'graph' },
          nodes: [
            { id: 'source', type: 'node', x: 0, y: 0, width: 20, height: 20 },
            { id: 'target', type: 'node', x: 100, y: 100, width: 20, height: 20 },
          ],
          edges: [{ id: 'edge-1', type: 'edge', source: 'source', target: 'target' }],
        },
        false,
      );
      const createdEdge = controller.getEdgeById('edge-1');
      if (!(createdEdge instanceof NoBendpointsEdge)) {
        throw new Error('The controller should create NoBendpointsEdge edges');
      }
      edge = createdEdge;
    };

    it('getStartPoint should delegate to super', () => {
      setupEdge();

      const superStartPoint = new Point(0, 0);
      vi.spyOn(Object.getPrototypeOf(NoBendpointsEdge.prototype), 'getStartPoint').mockReturnValue(superStartPoint);

      expect(edge.getStartPoint()).toBe(superStartPoint);
    });

    it('getEndPoint should delegate to super', () => {
      setupEdge();

      const superEndPoint = new Point(5, 5);
      vi.spyOn(Object.getPrototypeOf(NoBendpointsEdge.prototype), 'getEndPoint').mockReturnValue(superEndPoint);

      expect(edge.getEndPoint()).toBe(superEndPoint);
    });
  });
});
