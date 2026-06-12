import { Point } from '@patternfly/react-topology';

import { LayoutType } from '../../components/Visualization/Canvas/canvas.models';
import { OrthogonalBendpointsEdge } from './OrthogonalBendpointsEdge';

const node = (pos: { x: number; y: number }, size: { width: number; height: number }) => ({
  getPosition: () => pos,
  getDimensions: () => size,
});

const wireEdge = (edge: OrthogonalBendpointsEdge, layout: string, source: unknown, target: unknown) => {
  jest.spyOn(edge, 'getSource').mockReturnValue(source as never);
  jest.spyOn(edge, 'getTarget').mockReturnValue(target as never);
  jest.spyOn(edge, 'getGraph').mockReturnValue({ getLayout: () => layout } as never);
};

describe('OrthogonalBendpointsEdge', () => {
  let edge: OrthogonalBendpointsEdge;

  beforeEach(() => {
    edge = new OrthogonalBendpointsEdge();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns no bendpoints for a self-loop', () => {
    const self = {};
    wireEdge(edge, LayoutType.DagreHorizontal, self, self);
    expect(edge.getBendpoints()).toEqual([]);
  });

  it('returns no bendpoints when source or target is missing', () => {
    wireEdge(edge, LayoutType.DagreHorizontal, undefined, node({ x: 0, y: 0 }, { width: 10, height: 10 }));
    expect(edge.getBendpoints()).toEqual([]);
  });

  it('produces a horizontal step (same Y as source) and a vertical step at midX in horizontal layout', () => {
    const source = node({ x: 0, y: 0 }, { width: 100, height: 50 });
    const target = node({ x: 300, y: 200 }, { width: 100, height: 50 });
    wireEdge(edge, LayoutType.DagreHorizontal, source, target);

    // Centers: source = (50, 25), target = (350, 225). midX = 200.
    expect(edge.getBendpoints()).toEqual([new Point(200, 25), new Point(200, 225)]);
  });

  it('produces a vertical step (same X as source) and a horizontal step at midY in vertical layout', () => {
    const source = node({ x: 0, y: 0 }, { width: 100, height: 50 });
    const target = node({ x: 300, y: 200 }, { width: 100, height: 50 });
    wireEdge(edge, LayoutType.DagreVertical, source, target);

    // Centers: source = (50, 25), target = (350, 225). midY = 125.
    expect(edge.getBendpoints()).toEqual([new Point(50, 125), new Point(350, 125)]);
  });
});
