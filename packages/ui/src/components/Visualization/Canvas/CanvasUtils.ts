import { CanvasDefaults } from './canvas.defaults';

export const getDragPreviewTransform = (
  width: number,
  height: number,
  scale: number = CanvasDefaults.DRAG_PREVIEW_SCALE,
): string => {
  const offsetX = (width * (1 - scale)) / 2;
  const offsetY = (height * (1 - scale)) / 2;
  return `translate(${offsetX}, ${offsetY}) scale(${scale})`;
};
