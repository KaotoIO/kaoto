import { Tooltip } from '@patternfly/react-core';
import { BanIcon, WarningTriangleIcon } from '@patternfly/react-icons';
import {
  AnchorEnd,
  DEFAULT_DECORATOR_RADIUS,
  DEFAULT_LAYER,
  Decorator,
  DefaultNode,
  Layer,
  Node,
  NodeStatus,
  Rect,
  WithSelectionProps,
  observer,
  useAnchor,
  useHover,
  useSelection,
  withContextMenu,
  withSelection,
} from '@patternfly/react-topology';
import { FunctionComponent, MouseEvent, useContext, useRef } from 'react';
import { SettingsContext } from '../../../../providers';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode } from '../../Canvas/canvas.models';
import { NodeContextMenuFn } from '../ContextMenu/NodeContextMenu';
import { TargetAnchor } from '../target-anchor';
import './CustomNode.scss';
import { StepToolbar } from '../../Canvas/StepToolbar/StepToolbar';
import { NodeToolbarTrigger } from '../../../../models';

interface CustomNodeProps extends WithSelectionProps {
  element: Node<CanvasNode, CanvasNode['data']>;
  onContextMenu: (e: MouseEvent) => void;
}

const CustomNode: FunctionComponent<CustomNodeProps> = observer(({ element, ...rest }) => {
  const vizNode = element.getData()?.vizNode;
  const settingsAdapter = useContext(SettingsContext);
  const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
  const isDisabled = !!vizNode?.getComponentSchema()?.definition?.disabled;
  const tooltipContent = vizNode?.getTooltipContent();
  const validationText = vizNode?.getNodeValidationText();
  const doesHaveWarnings = !isDisabled && !!validationText;
  const [isSelected, onSelect] = useSelection();
  const [isHover, hoverRef] = useHover<SVGGElement>();
  const boxRef = useRef<Rect>(element.getBounds());
  const decoratorRef = useRef<SVGGElement>(null);
  const shouldShowToolbar =
    settingsAdapter.getSettings().nodeToolbarTrigger === NodeToolbarTrigger.onHover
      ? isHover || isSelected
      : isSelected;

  useAnchor((element: Node) => {
    return new TargetAnchor(element);
  }, AnchorEnd.both);

  const toolbarHeight = 60;
  const toolbarWidth = 500;
  const toolbarX = (boxRef.current.width - toolbarWidth) / 2;

  if (!vizNode) {
    return null;
  }

  return (
    <Layer id={DEFAULT_LAYER}>
      <g
        ref={hoverRef}
        className="custom-node"
        data-testid={`custom-node__${vizNode.id}`}
        data-nodelabel={label}
        data-selected={isSelected}
        data-disabled={isDisabled}
        data-warning={doesHaveWarnings}
        onClick={onSelect}
        onContextMenu={rest.onContextMenu}
      >
        <rect className="phantom-rect" width={boxRef.current.width} height={boxRef.current.height} />
        <foreignObject data-nodelabel={label} width={boxRef.current.width} height={boxRef.current.height}>
          <div className="custom-node__container">
            <div title={tooltipContent} className="custom-node__container__image">
              <img src={vizNode?.data.icon} />
            </div>

            <div className="custom-node__container__label">
              <span title={label}>{label}</span>
            </div>
          </div>
        </foreignObject>

        {shouldShowToolbar && (
          <foreignObject
            className="custom-node__toolbar"
            x={toolbarX}
            y={toolbarHeight * -1}
            width={toolbarWidth}
            height={toolbarHeight}
          >
            <StepToolbar data-testid="step-toolbar" vizNode={vizNode} />
          </foreignObject>
        )}

        {doesHaveWarnings && (
          <Tooltip triggerRef={decoratorRef} content={validationText}>
            <Decorator
              className="custom-node__warning"
              innerRef={decoratorRef}
              ariaLabel={NodeStatus.warning}
              radius={DEFAULT_DECORATOR_RADIUS}
              x={CanvasDefaults.DEFAULT_NODE_WIDTH * 0.3}
              y={0}
              icon={<WarningTriangleIcon />}
              showBackground
            />
          </Tooltip>
        )}

        {isDisabled && (
          <Decorator
            radius={DEFAULT_DECORATOR_RADIUS}
            x={CanvasDefaults.DEFAULT_NODE_WIDTH * 0.7}
            y={0}
            icon={<BanIcon />}
            showBackground
          />
        )}
      </g>
    </Layer>
  );
});

export const CustomNodeWithSelection: typeof DefaultNode = withSelection()(
  withContextMenu(NodeContextMenuFn)(CustomNode as typeof DefaultNode),
) as typeof DefaultNode;
