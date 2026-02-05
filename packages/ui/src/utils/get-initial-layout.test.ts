import { LayoutType } from '../components/Visualization/Canvas/canvas.models';
import { CanvasLayoutDirection } from '../models';
import { getInitialLayout } from './get-initial-layout';

describe('getInitialLayout', () => {
  it('should return DagreHorizontal for Horizontal layout direction', () => {
    const result = getInitialLayout(CanvasLayoutDirection.Horizontal);
    expect(result).toBe(LayoutType.DagreHorizontal);
  });

  it('should return DagreVertical for Vertical layout direction', () => {
    const result = getInitialLayout(CanvasLayoutDirection.Vertical);
    expect(result).toBe(LayoutType.DagreVertical);
  });

  it('should return undefined for User layout direction', () => {
    const result = getInitialLayout(CanvasLayoutDirection.SelectInCanvas);
    expect(result).toBeUndefined();
  });

  it('should return undefined for any other value', () => {
    const result = getInitialLayout('invalid' as CanvasLayoutDirection);
    expect(result).toBeUndefined();
  });
});
