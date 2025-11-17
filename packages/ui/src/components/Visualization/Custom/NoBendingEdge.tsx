import { BaseEdge, getTopCollapsedParent, Point } from '@patternfly/react-topology';

import { LayoutType } from '../Canvas';

export class NoBendpointsEdge extends BaseEdge {
  getBendpoints(): Point[] {
    return [];
  }

  getStartPoint(): Point {
    if (this.getTarget() === this.getSource()) {
      const parent = getTopCollapsedParent(this.getSource());
      const isHorizontal = this.getGraph().getLayout() === LayoutType.DagreHorizontal;
      const parentPos = parent.getPosition();
      const parentSize = parent.getDimensions();
      let x, y;
      if (isHorizontal) {
        if (parent.getType() === 'group') {
          x = parentPos.x + parentSize.width / 2.0;
          y = parentPos.y;
        } else {
          x = parentPos.x + parentSize.width;
          y = parentPos.y + parentSize.height / 2.0;
        }
      } else {
        if (parent.getType() === 'group') {
          x = parentPos.x;
          y = parentPos.y + parentSize.height / 2.0;
        } else {
          x = parentPos.x + parentSize.width / 2.0;
          y = parentPos.y + parentSize.height;
        }
      }
      return new Point(x, y);
    }

    return super.getStartPoint();
  }

  getEndPoint(): Point {
    if (this.getTarget() === this.getSource()) {
      const parent = getTopCollapsedParent(this.getSource());
      const isHorizontal = this.getGraph().getLayout() === LayoutType.DagreHorizontal;
      const parentPos = parent.getPosition();
      const parentSize = parent.getDimensions();
      let x, y;
      if (isHorizontal) {
        if (parent.getType() === 'group') {
          x = parentPos.x + parentSize.width / 2.0 + 15;
          y = parentPos.y;
        } else {
          x = parentPos.x + parentSize.width / 2.0 + 55;
          y = parentPos.y + parentSize.height / 2.0;
        }
      } else {
        if (parent.getType() === 'group') {
          x = parentPos.x;
          y = parentPos.y + parentSize.height / 2.0 + 15;
        } else {
          x = parentPos.x + parentSize.width / 2.0;
          y = parentPos.y + parentSize.height / 2.0 + 85;
        }
      }
      return new Point(x, y);
    }

    return super.getEndPoint();
  }
}
