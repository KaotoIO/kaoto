import { Icon } from '@patternfly/react-core';
import { ArrowDownIcon, ArrowRightIcon, BanIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  AnchorEnd,
  GROUPS_LAYER,
  Layer,
  Node,
  Rect,
  TOP_LAYER,
  isNode,
  observer,
  useAnchor,
  useHover,
  withDndDrop,
} from '@patternfly/react-topology';
import { FunctionComponent, useContext, useRef } from 'react';
import { AddStepMode, IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { SettingsContext } from '../../../../providers';
import { LayoutType } from '../../Canvas';
import { StepToolbar } from '../../Canvas/StepToolbar/StepToolbar';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { AddStepIcon } from '../Edge/AddStepIcon';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';
import { customGroupExpandedDropTargetSpec } from '../customComponentUtils';
import { TargetAnchor } from '../target-anchor';
import './CustomGroupExpanded.scss';
import { CustomGroupProps } from './Group.models';

export const CustomGroupExpandedInner: FunctionComponent<CustomGroupProps> = observer(
  ({ element, onContextMenu, onCollapseToggle, dndDropRef, droppable, selected, onSelect }) => {
    if (!isNode(element)) {
      throw new Error('CustomGroupExpanded must be used only on Node elements');
    }

    const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
    const lastUpdate = vizNode?.lastUpdate;
    const settingsAdapter = useContext(SettingsContext);
    const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
    const isDisabled = !!vizNode?.getNodeDefinition()?.disabled;
    const validationText = vizNode?.getNodeValidationText();
    const doesHaveWarnings = !isDisabled && !!validationText;
    const tooltipContent = vizNode?.getTooltipContent();
    const [isGHover, gHoverRef] = useHover<SVGGElement>(CanvasDefaults.HOVER_DELAY_IN, CanvasDefaults.HOVER_DELAY_OUT);
    const [isToolbarHover, toolbarHoverRef] = useHover<SVGForeignObjectElement>(
      CanvasDefaults.HOVER_DELAY_IN,
      CanvasDefaults.HOVER_DELAY_OUT,
    );
    const boxRef = useRef<Rect | null>(null);
    const shouldShowToolbar =
      settingsAdapter.getSettings().nodeToolbarTrigger === NodeToolbarTrigger.onHover
        ? isGHover || isToolbarHover || selected
        : selected;
    const shouldShowAddStep =
      shouldShowToolbar && vizNode?.getNodeInteraction().canHaveNextStep && vizNode.getNextNode() === undefined;
    const isHorizontal = element.getGraph().getLayout() === LayoutType.DagreHorizontal;

    useAnchor((element: Node) => {
      return new TargetAnchor(element);
    }, AnchorEnd.both);

    if (!vizNode) {
      return null;
    }

    if (!droppable || !boxRef.current) {
      boxRef.current = element.getBounds();
    }
    const toolbarWidth = Math.max(CanvasDefaults.STEP_TOOLBAR_WIDTH, boxRef.current.width);
    const toolbarX = boxRef.current.x + (boxRef.current.width - toolbarWidth) / 2;
    const toolbarY = boxRef.current.y - CanvasDefaults.STEP_TOOLBAR_HEIGHT;
    const addStepX = isHorizontal
      ? boxRef.current.x + boxRef.current.width
      : boxRef.current.x + (boxRef.current.width - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2;
    const addStepY = isHorizontal
      ? boxRef.current.y + (boxRef.current.height - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2
      : boxRef.current.y + boxRef.current.height;

    return (
      <Layer id={GROUPS_LAYER} data-lastupdate={lastUpdate}>
        <g
          ref={gHoverRef}
          className="custom-group"
          data-testid={`custom-group__${vizNode.id}`}
          data-grouplabel={label}
          data-selected={selected}
          data-disabled={isDisabled}
          data-toolbar-open={shouldShowToolbar}
          data-warnings={doesHaveWarnings}
          onClick={onSelect}
          onContextMenu={onContextMenu}
        >
          <foreignObject
            ref={dndDropRef}
            data-nodelabel={label}
            x={boxRef.current.x}
            y={boxRef.current.y}
            width={boxRef.current.width}
            height={boxRef.current.height}
          >
            <div className="custom-group__container">
              <div className="custom-group__container__text" title={tooltipContent}>
                {doesHaveWarnings ? (
                  <div className="custom-group__container__icon-placeholder" />
                ) : (
                  <img alt={tooltipContent} src={vizNode.data.icon} />
                )}
                <span title={label}>{label}</span>
              </div>

              {isDisabled && !doesHaveWarnings && (
                <Icon className="custom-group__disabled-icon" title="Step disabled">
                  <BanIcon />
                </Icon>
              )}
            </div>
          </foreignObject>
          {doesHaveWarnings && !isDisabled && (
            <foreignObject
              className="custom-group__warning-icon--floating"
              x={boxRef.current.x - 7}
              y={boxRef.current.y - 7}
              width={25}
              height={25}
            >
              <FloatingCircle>
                <Icon status="danger" className="custom-group__warning-icon" title={validationText}>
                  <ExclamationCircleIcon />
                </Icon>
              </FloatingCircle>
            </foreignObject>
          )}
          {shouldShowToolbar && (
            <Layer id={TOP_LAYER}>
              <foreignObject
                ref={toolbarHoverRef}
                className="custom-group__toolbar"
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
              x={addStepX}
              y={addStepY}
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
        </g>
      </Layer>
    );
  },
);

export const CustomGroupExpanded = withDndDrop(customGroupExpandedDropTargetSpec)(CustomGroupExpandedInner);
