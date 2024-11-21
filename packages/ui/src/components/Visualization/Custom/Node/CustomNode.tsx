import { Icon } from '@patternfly/react-core';
import { ArrowDownIcon, ArrowRightIcon, BanIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import type { DefaultNode, ElementModel, GraphElement, Node } from '@patternfly/react-topology';
import {
  AnchorEnd,
  DEFAULT_LAYER,
  LabelBadge,
  Layer,
  Rect,
  TOP_LAYER,
  WithSelectionProps,
  isNode,
  observer,
  useAnchor,
  useHover,
  useSelection,
  withContextMenu,
} from '@patternfly/react-topology';
import clsx from 'clsx';
import { FunctionComponent, useContext, useRef } from 'react';
import { AddStepMode, IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { SettingsContext } from '../../../../providers';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode, LayoutType } from '../../Canvas/canvas.models';
import { StepToolbar } from '../../Canvas/StepToolbar/StepToolbar';
import { NodeContextMenuFn } from '../ContextMenu/NodeContextMenu';
import { AddStepIcon } from '../Edge/AddStepIcon';
import { TargetAnchor } from '../target-anchor';
import './CustomNode.scss';

type DefaultNodeProps = Parameters<typeof DefaultNode>[0];
interface CustomNodeProps extends DefaultNodeProps, WithSelectionProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
  /** Toggle node collapse / expand */
  onCollapseToggle?: () => void;
}

const CustomNode: FunctionComponent<CustomNodeProps> = observer(({ element, onContextMenu, onCollapseToggle }) => {
  if (!isNode(element)) {
    throw new Error('CustomNode must be used only on Node elements');
  }

  const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
  const settingsAdapter = useContext(SettingsContext);
  const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
  const isDisabled = !!vizNode?.getComponentSchema()?.definition?.disabled;
  const tooltipContent = vizNode?.getTooltipContent();
  const validationText = vizNode?.getNodeValidationText();
  const doesHaveWarnings = !isDisabled && !!validationText;
  const [isSelected, onSelect] = useSelection();
  const [isGHover, gHoverRef] = useHover<SVGGElement>(CanvasDefaults.HOVER_DELAY_IN, CanvasDefaults.HOVER_DELAY_OUT);
  const [isToolbarHover, toolbarHoverRef] = useHover<SVGForeignObjectElement>(
    CanvasDefaults.HOVER_DELAY_IN,
    CanvasDefaults.HOVER_DELAY_OUT,
  );
  const childCount = element.getAllNodeChildren().length;
  const boxRef = useRef<Rect>(element.getBounds());
  const shouldShowToolbar =
    settingsAdapter.getSettings().nodeToolbarTrigger === NodeToolbarTrigger.onHover
      ? isGHover || isToolbarHover || isSelected
      : isSelected;
  const shouldShowAddStep =
    shouldShowToolbar && vizNode?.getNodeInteraction().canHaveNextStep && vizNode.getNextNode() === undefined;
  const isHorizontal = element.getGraph().getLayout() === LayoutType.DagreHorizontal;

  useAnchor((element: Node) => {
    return new TargetAnchor(element);
  }, AnchorEnd.both);

  const labelX = (boxRef.current.width - CanvasDefaults.DEFAULT_LABEL_WIDTH) / 2;
  const toolbarWidth = CanvasDefaults.STEP_TOOLBAR_WIDTH;
  const toolbarX = (boxRef.current.width - toolbarWidth) / 2;
  const toolbarY = CanvasDefaults.STEP_TOOLBAR_HEIGHT * -1;

  if (!vizNode) {
    return null;
  }

  return (
    <Layer id={DEFAULT_LAYER}>
      <g
        ref={gHoverRef}
        className="custom-node"
        data-testid={`custom-node__${vizNode.id}`}
        data-nodelabel={label}
        data-selected={isSelected}
        data-disabled={isDisabled}
        data-toolbar-open={shouldShowToolbar}
        data-warning={doesHaveWarnings}
        onClick={onSelect}
        onContextMenu={onContextMenu}
      >
        <foreignObject data-nodelabel={label} width={boxRef.current.width} height={boxRef.current.height}>
          <div className="custom-node__container">
            <div title={tooltipContent} className="custom-node__container__image">
              <img alt={tooltipContent} src={vizNode.data.icon} />

              {isDisabled && (
                <Icon className="disabled-step-icon">
                  <BanIcon />
                </Icon>
              )}
            </div>
          </div>
        </foreignObject>

        <foreignObject
          x={labelX}
          y={boxRef.current.height - 1}
          width={CanvasDefaults.DEFAULT_LABEL_WIDTH}
          height={CanvasDefaults.DEFAULT_LABEL_HEIGHT}
          className="custom-node__label"
        >
          <div
            className={clsx('custom-node__label__text', {
              'custom-node__label__text__error': doesHaveWarnings,
            })}
          >
            {doesHaveWarnings && (
              <Icon title={validationText} data-warning={doesHaveWarnings}>
                <ExclamationCircleIcon />
              </Icon>
            )}
            <span title={label}>{label}</span>
          </div>
        </foreignObject>

        {shouldShowToolbar && (
          <Layer id={TOP_LAYER}>
            <foreignObject
              ref={toolbarHoverRef}
              className="custom-node__toolbar"
              x={toolbarX}
              y={toolbarY}
              width={toolbarWidth}
              height={CanvasDefaults.STEP_TOOLBAR_HEIGHT}
            >
              <StepToolbar
                data-testid="step-toolbar"
                vizNode={vizNode}
                isCollapsed={element.isCollapsed()}
                onCollapseToggle={onCollapseToggle}
              />
            </foreignObject>
          </Layer>
        )}

        {shouldShowAddStep && (
          <foreignObject
            x={boxRef.current.width - 8}
            y={(boxRef.current.height - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2}
            width={CanvasDefaults.ADD_STEP_ICON_SIZE}
            height={CanvasDefaults.ADD_STEP_ICON_SIZE}
          >
            <AddStepIcon
              vizNode={vizNode}
              mode={AddStepMode.AppendStep}
              title="Add step"
              data-testid="quick-append-step"
            >
              <Icon size="lg">{isHorizontal ? <ArrowRightIcon /> : <ArrowDownIcon />}</Icon>
            </AddStepIcon>
          </foreignObject>
        )}

        {childCount && <LabelBadge badge={`${childCount}`} x={0} y={0} />}
      </g>
    </Layer>
  );
});

export const CustomNodeWithSelection = withContextMenu(NodeContextMenuFn)(CustomNode);
