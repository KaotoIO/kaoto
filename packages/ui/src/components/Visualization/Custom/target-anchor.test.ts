import { Node, Point, Rect } from '@patternfly/react-topology';
import { TargetAnchor } from './target-anchor';

describe('TargetAnchor', () => {
  /**
   * ______
   * |    | height: 50
   * |____|
   * width: 50
   *
   *       (*) reference point
   *           (x: 100, y: 100)
   */
  it('should return the closest point of a rectangle to a reference point below', () => {
    const element = {
      getBounds: () => new Rect(0, 0, 50, 50),
    } as Node;
    const targetAnchor = new TargetAnchor(element);

    const reference = new Point(100, 100);
    const result = targetAnchor.getLocation(reference);

    expect(result).toEqual({ x: 50, y: 50 });
  });

  /**
   *
   *   (*) reference point
   *        (x: 25, y: 25)
   * ______
   * |    | height: 50
   * |____|
   * width: 50
   * top left corner: (0, 100)
   */
  it('should return the closest point of a rectangle to a reference point above', () => {
    const reference = new Point(25, 25);

    const element = {
      getBounds: () => new Rect(0, 100, 50, 50),
    } as Node;
    const targetAnchor = new TargetAnchor(element);

    const result = targetAnchor.getLocation(reference);

    expect(result).toEqual({ x: 25, y: 100 });
  });

  it('should delegate to the super class to get the reference point', () => {
    const superSpy = jest.spyOn(TargetAnchor.prototype, 'getReferencePoint');
    const element = {
      getBounds: () => new Rect(0, 0, 50, 50),
    } as Node;

    const targetAnchor = new TargetAnchor(element);
    targetAnchor.getReferencePoint();

    expect(superSpy).toHaveBeenCalled();
  });
});
