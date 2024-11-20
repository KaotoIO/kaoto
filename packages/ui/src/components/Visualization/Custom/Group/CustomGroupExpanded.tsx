import { Icon } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
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
  useSelection,
} from '@patternfly/react-topology';
import { FunctionComponent, useContext, useRef } from 'react';
import { IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { SettingsContext } from '../../../../providers';
import { StepToolbar } from '../../Canvas/StepToolbar/StepToolbar';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { TargetAnchor } from '../target-anchor';
import './CustomGroupExpanded.scss';
import { CustomGroupProps } from './Group.models';

export const CustomGroupExpanded: FunctionComponent<CustomGroupProps> = observer(
  ({ element, onContextMenu, onCollapseToggle }) => {
    if (!isNode(element)) {
      throw new Error('CustomGroupExpanded must be used only on Node elements');
    }

    const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
    const settingsAdapter = useContext(SettingsContext);
    const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
    const isDisabled = !!vizNode?.getComponentSchema()?.definition?.disabled;
    const tooltipContent = vizNode?.getTooltipContent();
    const [isSelected, onSelect] = useSelection();
    const [isGHover, gHoverRef] = useHover<SVGGElement>();
    const [isToolbarHover, toolbarHoverRef] = useHover<SVGForeignObjectElement>();
    const boxRef = useRef<Rect>(element.getBounds());
    const shouldShowToolbar =
      settingsAdapter.getSettings().nodeToolbarTrigger === NodeToolbarTrigger.onHover
        ? isGHover || isToolbarHover || isSelected
        : isSelected;

    useAnchor((element: Node) => {
      return new TargetAnchor(element);
    }, AnchorEnd.both);

    if (!vizNode) {
      return null;
    }

    boxRef.current = element.getBounds();
    const toolbarWidth = Math.max(CanvasDefaults.STEP_TOOLBAR_WIDTH, boxRef.current.width);
    const toolbarX = boxRef.current.x + (boxRef.current.width - toolbarWidth) / 2;
    const toolbarY = boxRef.current.y - CanvasDefaults.STEP_TOOLBAR_HEIGHT;

    return (
      <Layer id={GROUPS_LAYER}>
        <g
          ref={gHoverRef}
          className="custom-group"
          data-testid={`custom-group__${vizNode.id}`}
          data-grouplabel={label}
          data-selected={isSelected}
          data-disabled={isDisabled}
          data-toolbar-open={shouldShowToolbar}
          onClick={onSelect}
          onContextMenu={onContextMenu}
        >
          <foreignObject
            data-nodelabel={label}
            x={boxRef.current.x}
            y={boxRef.current.y}
            width={boxRef.current.width}
            height={boxRef.current.height}
          >
            <div className="custom-group__container">
              <div className="custom-group__container__title" title={tooltipContent}>
                <img src={vizNode.data.icon} />
                <span title={label}>{label}</span>
              </div>

              {isDisabled && (
                <Icon className="disabled-step-icon" title="Step disabled">
                  <BanIcon />
                </Icon>
              )}
            </div>
          </foreignObject>

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
        </g>
      </Layer>
    );
  },
);
