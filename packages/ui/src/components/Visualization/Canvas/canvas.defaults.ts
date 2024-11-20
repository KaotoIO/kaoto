import { NodeShape } from '@patternfly/react-topology';
import { LayoutType } from './canvas.models';

export class CanvasDefaults {
  static readonly DEFAULT_LAYOUT = LayoutType.DagreVertical;
  static readonly DEFAULT_SIDEBAR_WIDTH = 500;
  static readonly DEFAULT_LABEL_WIDTH = 150;
  static readonly DEFAULT_LABEL_HEIGHT = 32;

  static readonly DEFAULT_NODE_SHAPE = NodeShape.rect;
  static readonly DEFAULT_NODE_WIDTH = 90;
  static readonly DEFAULT_NODE_HEIGHT = 75;

  static readonly DEFAULT_GROUP_PADDING = 40;

  static readonly STEP_TOOLBAR_WIDTH = 350;
  static readonly STEP_TOOLBAR_HEIGHT = 60;

  static readonly HOVER_DELAY_IN = 200;
  static readonly HOVER_DELAY_OUT = 500;
}
