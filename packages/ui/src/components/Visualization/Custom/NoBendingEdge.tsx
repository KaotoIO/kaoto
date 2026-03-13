import { BaseEdge, getTopCollapsedParent, Point } from '@patternfly/react-topology';

// Self-loop edge offset constants for different layout configurations
const SELF_LOOP_OFFSET_SMALL = 15;
const SELF_LOOP_OFFSET_MEDIUM = 55;
const SELF_LOOP_OFFSET_LARGE = 85;

import { LayoutType } from '../Canvas';

export class NoBendpointsEdge extends BaseEdge {
  getBendpoints(): Point[] {
    return [];
  }

  getStartPoint(): Point {
    if (this.getTarget() === this.getSource()) {
      const parent = getTopCollapsedParent(this.getSource());
      const isHorizontal = this.getGraph().getLayout() === LayoutType.DagreHorizontal;
      const isGroupParent = parent.getType() === 'group';
      const parentPos = parent.getPosition();
      const parentSize = parent.getDimensions();
      let x, y;
      if (isHorizontal) {
        if (isGroupParent) {
          x = parentPos.x + parentSize.width / 2;
          y = parentPos.y;
        } else {
          x = parentPos.x + parentSize.width;
          y = parentPos.y + parentSize.height / 2;
        }
      } else if (isGroupParent) {
        x = parentPos.x;
        y = parentPos.y + parentSize.height / 2;
      } else {
        x = parentPos.x + parentSize.width / 2;
        y = parentPos.y + parentSize.height;
      }
      return new Point(x, y);
    }

    return super.getStartPoint();
  }

  getEndPoint(): Point {
    if (this.getTarget() === this.getSource()) {
      const parent = getTopCollapsedParent(this.getSource());
      const isHorizontal = this.getGraph().getLayout() === LayoutType.DagreHorizontal;
      const isGroupParent = parent.getType() === 'group';
      const parentPos = parent.getPosition();
      const parentSize = parent.getDimensions();
      let x, y;
      if (isHorizontal) {
        if (isGroupParent) {
          x = parentPos.x + parentSize.width / 2 + SELF_LOOP_OFFSET_SMALL;
          y = parentPos.y;
        } else {
          x = parentPos.x + parentSize.width / 2 + SELF_LOOP_OFFSET_MEDIUM;
          y = parentPos.y + parentSize.height / 2;
        }
      } else if (isGroupParent) {
        x = parentPos.x;
        y = parentPos.y + parentSize.height / 2 + SELF_LOOP_OFFSET_SMALL;
      } else {
        x = parentPos.x + parentSize.width / 2;
        y = parentPos.y + parentSize.height / 2 + SELF_LOOP_OFFSET_LARGE;
      }
      return new Point(x, y);
    }

    return super.getEndPoint();
  }
}
