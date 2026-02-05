import { LayoutType } from '../components/Visualization/Canvas/canvas.models';
import { CanvasLayoutDirection } from '../models/settings/settings.model';

export const getInitialLayout = (canvasLayoutDirection: CanvasLayoutDirection): LayoutType | undefined => {
  switch (canvasLayoutDirection) {
    case CanvasLayoutDirection.Horizontal:
      return LayoutType.DagreHorizontal;
    case CanvasLayoutDirection.Vertical:
      return LayoutType.DagreVertical;
    default:
      return undefined;
  }
};
