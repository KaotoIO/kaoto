import { NodeShape } from '@patternfly/react-topology';
import { LayoutType } from './canvas.models';

export class CanvasDefaults {
  static readonly DEFAULT_LAYOUT = LayoutType.DagreVertical;
  static readonly DEFAULT_NODE_SHAPE = NodeShape.rect;
  static readonly DEFAULT_NODE_WIDTH = 150;
  static readonly DEFAULT_NODE_HEIGHT = 85;
  static readonly DEFAULT_GROUP_PADDING = 65;
  static readonly DEFAULT_SIDEBAR_WIDTH = 500;
}
