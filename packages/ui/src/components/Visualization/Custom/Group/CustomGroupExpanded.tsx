import {
  AbstractAnchor,
  AnchorEnd,
  CollapsibleGroupProps,
  GROUPS_LAYER,
  Layer,
  Node,
  Point,
  Rect,
  WithContextMenuProps,
  WithDndDropProps,
  WithDragNodeProps,
  WithSelectionProps,
  observer,
  useAnchor,
} from '@patternfly/react-topology';
import { FunctionComponent, useRef } from 'react';
import { CollapseButton } from './CollapseButton';
import { ContextMenuButton } from './ContextMenuButton';
import { CustomGroupProps } from './Group.models';

type CustomGroupExpandedProps = CustomGroupProps &
  CollapsibleGroupProps &
  WithDragNodeProps &
  WithSelectionProps &
  WithDndDropProps &
  WithContextMenuProps;

class TargetAnchor extends AbstractAnchor {
  getLocation(reference: Point): Point {
    return this.closestPointOnRectangle(this.owner.getBounds(), reference);
  }

  getReferencePoint(): Point {
    return super.getReferencePoint();
  }

  private closestPointOnRectangle(rect: Rect, point: Point): Point {
    // Deconstruct the rectangle and point parameters
    const { x: rx, y: ry, width, height } = rect;
    const { x: px, y: py } = point;

    // Calculate the projections on the edges
    // For left edge
    const leftX = rx;
    const leftY = Math.max(ry, Math.min(py, ry + height));

    // For right edge
    const rightX = rx + width;
    const rightY = Math.max(ry, Math.min(py, ry + height));

    // For top edge
    const topX = Math.max(rx, Math.min(px, rx + width));
    const topY = ry;

    // For bottom edge
    const bottomX = Math.max(rx, Math.min(px, rx + width));
    const bottomY = ry + height;

    // Calculate distances to each edge projection
    const distances = [
      { x: leftX, y: leftY, dist: Math.hypot(px - leftX, py - leftY) },
      { x: rightX, y: rightY, dist: Math.hypot(px - rightX, py - rightY) },
      { x: topX, y: topY, dist: Math.hypot(px - topX, py - topY) },
      { x: bottomX, y: bottomY, dist: Math.hypot(px - bottomX, py - bottomY) },
    ];

    // Find the minimum distance
    const closestPoint = distances.reduce((minPoint, currentPoint) =>
      currentPoint.dist < minPoint.dist ? currentPoint : minPoint,
    );

    // Return the closest point
    return new Point(closestPoint.x, closestPoint.y);
  }
}

export const CustomGroupExpanded: FunctionComponent<CustomGroupExpandedProps> = observer(
  ({ className, element, onSelect, label: propsLabel, onContextMenu, onCollapseChange }) => {
    const label = propsLabel || element.getLabel();
    const boxRef = useRef<Rect>(element.getBounds());
    const vizNode = element.getData()?.vizNode;

    useAnchor((element: Node) => {
      return new TargetAnchor(element);
    }, AnchorEnd.both);

    boxRef.current = element.getBounds();

    return (
      <g onContextMenu={onContextMenu} onClick={onSelect} className={className}>
        <Layer id={GROUPS_LAYER}>
          <g>
            <rect
              className="phantom-rect"
              x={boxRef.current.x}
              y={boxRef.current.y}
              width={boxRef.current.width}
              height={boxRef.current.height}
            />
            <foreignObject
              className="foreign-object"
              x={boxRef.current.x}
              y={boxRef.current.y}
              width={boxRef.current.width}
              height={boxRef.current.height}
            >
              <div className={className}>
                <div className="custom-group__title">
                  <div className="custom-group__title__img-circle">
                    <img src={vizNode?.data.icon} />
                  </div>
                  <span title={label}>{label}</span>

                  <CollapseButton element={element} onCollapseChange={onCollapseChange} />
                  <ContextMenuButton element={element} />
                </div>
              </div>
            </foreignObject>
          </g>
        </Layer>
      </g>
    );
  },
);
