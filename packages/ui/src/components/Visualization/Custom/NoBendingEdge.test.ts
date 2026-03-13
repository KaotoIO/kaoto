import { getTopCollapsedParent, Point } from '@patternfly/react-topology';

import { NoBendpointsEdge } from './NoBendingEdge';

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return {
    ...actual,
    getTopCollapsedParent: jest.fn(),
  };
});

const mockGetTopCollapsedParent = getTopCollapsedParent as jest.Mock;

describe('NoBendpointsEdge', () => {
  let edge: NoBendpointsEdge;

  const mockParent = (type: string, pos: { x: number; y: number }, size: { width: number; height: number }) => ({
    getType: () => type,
    getPosition: () => pos,
    getDimensions: () => size,
  });

  const setupSelfLoop = (layout: string, parentType: string) => {
    const parent = mockParent(parentType, { x: 10, y: 20 }, { width: 100, height: 50 });
    const mockNode = {};
    mockGetTopCollapsedParent.mockReturnValue(parent);
    jest.spyOn(edge, 'getSource').mockReturnValue(mockNode as never);
    jest.spyOn(edge, 'getTarget').mockReturnValue(mockNode as never);
    jest.spyOn(edge, 'getGraph').mockReturnValue({
      getLayout: () => layout,
    } as never);
  };

  beforeEach(() => {
    edge = new NoBendpointsEdge();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return empty bendpoints', () => {
    expect(edge.getBendpoints()).toEqual([]);
  });

  describe('getStartPoint - self-loop', () => {
    it('horizontal layout, group parent: center-top', () => {
      setupSelfLoop('DagreHorizontal', 'group');
      const point = edge.getStartPoint();
      expect(point).toEqual(new Point(10 + 100 / 2, 20));
    });

    it('horizontal layout, non-group parent: right-center', () => {
      setupSelfLoop('DagreHorizontal', 'node');
      const point = edge.getStartPoint();
      expect(point).toEqual(new Point(10 + 100, 20 + 50 / 2));
    });

    it('vertical layout, group parent: left-center', () => {
      setupSelfLoop('DagreVertical', 'group');
      const point = edge.getStartPoint();
      expect(point).toEqual(new Point(10, 20 + 50 / 2));
    });

    it('vertical layout, non-group parent: center-bottom', () => {
      setupSelfLoop('DagreVertical', 'node');
      const point = edge.getStartPoint();
      expect(point).toEqual(new Point(10 + 100 / 2, 20 + 50));
    });
  });

  describe('getEndPoint - self-loop', () => {
    it('horizontal layout, group parent: offset center-top', () => {
      setupSelfLoop('DagreHorizontal', 'group');
      const point = edge.getEndPoint();
      expect(point).toEqual(new Point(10 + 100 / 2 + 15, 20));
    });

    it('horizontal layout, non-group parent: offset center', () => {
      setupSelfLoop('DagreHorizontal', 'node');
      const point = edge.getEndPoint();
      expect(point).toEqual(new Point(10 + 100 / 2 + 55, 20 + 50 / 2));
    });

    it('vertical layout, group parent: left offset-center', () => {
      setupSelfLoop('DagreVertical', 'group');
      const point = edge.getEndPoint();
      expect(point).toEqual(new Point(10, 20 + 50 / 2 + 15));
    });

    it('vertical layout, non-group parent: center offset-bottom', () => {
      setupSelfLoop('DagreVertical', 'node');
      const point = edge.getEndPoint();
      expect(point).toEqual(new Point(10 + 100 / 2, 20 + 50 / 2 + 85));
    });
  });

  describe('non-self-loop', () => {
    it('getStartPoint should delegate to super', () => {
      const mockSource = { id: 'source' };
      const mockTarget = { id: 'target' };
      jest.spyOn(edge, 'getSource').mockReturnValue(mockSource as never);
      jest.spyOn(edge, 'getTarget').mockReturnValue(mockTarget as never);

      const superStartPoint = new Point(0, 0);
      jest.spyOn(Object.getPrototypeOf(NoBendpointsEdge.prototype), 'getStartPoint').mockReturnValue(superStartPoint);

      expect(edge.getStartPoint()).toBe(superStartPoint);
    });

    it('getEndPoint should delegate to super', () => {
      const mockSource = { id: 'source' };
      const mockTarget = { id: 'target' };
      jest.spyOn(edge, 'getSource').mockReturnValue(mockSource as never);
      jest.spyOn(edge, 'getTarget').mockReturnValue(mockTarget as never);

      const superEndPoint = new Point(5, 5);
      jest.spyOn(Object.getPrototypeOf(NoBendpointsEdge.prototype), 'getEndPoint').mockReturnValue(superEndPoint);

      expect(edge.getEndPoint()).toBe(superEndPoint);
    });
  });
});
