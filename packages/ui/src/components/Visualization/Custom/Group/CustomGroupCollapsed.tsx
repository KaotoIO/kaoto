import { Tooltip } from '@patternfly/react-core';
import { ExpandArrowsAltIcon } from '@patternfly/react-icons';
import {
  CollapsibleGroupProps,
  GROUPS_LAYER,
  LabelBadge,
  Layer,
  NodeLabel,
  WithContextMenuProps,
  WithDndDropProps,
  WithDragNodeProps,
  WithSelectionProps,
  getShapeComponent,
  observer,
  useSvgAnchor,
} from '@patternfly/react-topology';
import { FunctionComponent, useCallback } from 'react';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CustomGroupProps } from './Group.models';

type CustomGroupExpandedProps = CustomGroupProps &
  CollapsibleGroupProps &
  WithDragNodeProps &
  WithSelectionProps &
  WithDndDropProps &
  WithContextMenuProps;

export const CustomGroupCollapsed: FunctionComponent<CustomGroupExpandedProps> = observer(
  ({
    className,
    children,
    collapsedWidth = CanvasDefaults.DEFAULT_NODE_DIAMETER,
    collapsedHeight = CanvasDefaults.DEFAULT_NODE_DIAMETER,
    collapsedShadowOffset = 8,
    element,
    onSelect,
    label: propsLabel,
    onContextMenu,
    contextMenuOpen,
    onCollapseChange,
  }) => {
    const ShapeComponent = getShapeComponent(element);
    const label = propsLabel || element.getLabel();
    const childCount = element.getAllNodeChildren().length;
    const vizNode = element.getData()?.vizNode;
    const tooltipContent = vizNode?.getTooltipContent();
    const anchorRef = useSvgAnchor();

    const onActionIconClick = useCallback(() => {
      onCollapseChange?.(element, false);
    }, [element, onCollapseChange]);

    return (
      <g onContextMenu={onContextMenu} onClick={onSelect} className={className}>
        <Layer id={GROUPS_LAYER}>
          <g>
            <rect className="phantom-rect" ref={anchorRef} width={collapsedWidth} height={collapsedHeight} />

            <g transform={`translate(${collapsedShadowOffset * 2}, 0)`}>
              <ShapeComponent element={element} width={collapsedWidth} height={collapsedHeight} />
            </g>
            <g transform={`translate(${collapsedShadowOffset}, 0)`}>
              <ShapeComponent element={element} width={collapsedWidth} height={collapsedHeight} />
            </g>
            <ShapeComponent element={element} width={collapsedWidth} height={collapsedHeight} />

            <foreignObject
              data-nodelabel={label}
              className="foreign-object"
              width={collapsedWidth}
              height={collapsedHeight}
            >
              <Tooltip content={tooltipContent}>
                <div className="custom-node__image">
                  <img src={vizNode?.data.icon} />
                </div>
              </Tooltip>
            </foreignObject>
          </g>
        </Layer>

        {childCount && <LabelBadge badge={`${childCount}`} x={collapsedWidth} y={0 - collapsedShadowOffset} />}

        <NodeLabel
          x={collapsedWidth / 2}
          y={collapsedHeight + 6}
          paddingX={8}
          paddingY={5}
          onContextMenu={onContextMenu}
          contextMenuOpen={contextMenuOpen}
          actionIcon={<ExpandArrowsAltIcon data-testid={`collapseButton-${label}`} />}
          onActionIconClick={onActionIconClick}
        >
          {label || element.getLabel()}
        </NodeLabel>
        {children}
      </g>
    );
  },
);
