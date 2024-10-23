import {
  AnchorEnd,
  CollapsibleGroupProps,
  GROUPS_LAYER,
  Layer,
  Node,
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
import { TargetAnchor } from '../target-anchor';

type CustomGroupExpandedProps = CustomGroupProps &
  CollapsibleGroupProps &
  WithDragNodeProps &
  WithSelectionProps &
  WithDndDropProps &
  WithContextMenuProps;

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
              data-nodelabel={label}
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

                  <CollapseButton
                    data-testid={`collapseButton-${label}`}
                    element={element}
                    onCollapseChange={onCollapseChange}
                  />
                  <ContextMenuButton data-testid={`contextualMenu-${label}`} element={element} />
                </div>
              </div>
            </foreignObject>
          </g>
        </Layer>
      </g>
    );
  },
);
