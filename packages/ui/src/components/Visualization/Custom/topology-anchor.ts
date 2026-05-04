import { AbstractAnchor, Node, Point } from '@patternfly/react-topology';

import { CanvasDefaults } from '../Canvas/canvas.defaults';
import { LayoutType } from '../Canvas/canvas.models';

const isVerticalLayout = (owner: Node): boolean =>
  (owner.getGraph()?.getLayout?.() as LayoutType) !== LayoutType.DagreHorizontal;

/**
 * Fixed attachment points for topology cross-route edges (compatible with TaskEdge).
 * Outbound: bottom center in vertical layout, right center in horizontal layout.
 */
export class TopologySourceAnchor extends AbstractAnchor {
  getLocation(): Point {
    return this.getReferencePoint();
  }

  getReferencePoint(): Point {
    const bounds = this.owner.getBounds();
    if (isVerticalLayout(this.owner)) {
      return new Point(bounds.x + bounds.width / 2, bounds.bottom() + CanvasDefaults.DEFAULT_LABEL_HEIGHT);
    }
    return new Point(bounds.right(), bounds.y + bounds.height / 2);
  }
}

/**
 * Inbound: top center in vertical layout, left center in horizontal layout.
 */
export class TopologyTargetAnchor extends AbstractAnchor {
  getLocation(): Point {
    return this.getReferencePoint();
  }

  getReferencePoint(): Point {
    const bounds = this.owner.getBounds();
    if (isVerticalLayout(this.owner)) {
      return new Point(bounds.x + bounds.width / 2, bounds.y);
    }
    return new Point(bounds.x, bounds.y + bounds.height / 2);
  }
}
