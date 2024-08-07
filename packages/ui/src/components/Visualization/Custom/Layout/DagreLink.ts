import { LayoutLink, Point } from '@patternfly/react-topology';

/**
 * This class extends the LayoutLink class since DagreLink is not exported from
 * the react-topology library.
 *
 * Related issue: https://github.com/patternfly/react-topology/issues/230
 */
export class DagreLink extends LayoutLink {
  public points?: { x: number; y: number }[];

  updateBendpoints(): void {
    if (this.points && !this.isFalse && this.points.length > 2) {
      this.element.setBendpoints(this.points.slice(1, -1).map((point) => new Point(point.x, point.y)));
    }
  }
}
