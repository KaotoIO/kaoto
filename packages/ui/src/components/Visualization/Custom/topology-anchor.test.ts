import { Graph, Node, Point, Rect } from '@patternfly/react-topology';

import { LayoutType } from '../Canvas/canvas.models';
import { TopologySourceAnchor, TopologyTargetAnchor } from './topology-anchor';

const mockNode = (bounds: Rect, layout: LayoutType): Node =>
  ({
    getBounds: () => bounds,
    getGraph: () =>
      ({
        getLayout: () => layout,
      }) as Graph,
  }) as Node;

describe('TopologySourceAnchor', () => {
  it('returns bottom center in vertical layout', () => {
    const node = mockNode(new Rect(100, 100, 50, 50), LayoutType.DagreVertical);
    const anchor = new TopologySourceAnchor(node);

    expect(anchor.getReferencePoint()).toEqual(new Point(125, 174));
  });

  it('returns right center in horizontal layout', () => {
    const node = mockNode(new Rect(100, 100, 50, 50), LayoutType.DagreHorizontal);
    const anchor = new TopologySourceAnchor(node);

    expect(anchor.getReferencePoint()).toEqual(new Point(150, 125));
  });
});

describe('TopologyTargetAnchor', () => {
  it('returns top center in vertical layout', () => {
    const node = mockNode(new Rect(100, 100, 50, 50), LayoutType.DagreVertical);
    const anchor = new TopologyTargetAnchor(node);

    expect(anchor.getReferencePoint()).toEqual(new Point(125, 100));
  });

  it('returns left center in horizontal layout', () => {
    const node = mockNode(new Rect(100, 100, 50, 50), LayoutType.DagreHorizontal);
    const anchor = new TopologyTargetAnchor(node);

    expect(anchor.getReferencePoint()).toEqual(new Point(100, 125));
  });
});
