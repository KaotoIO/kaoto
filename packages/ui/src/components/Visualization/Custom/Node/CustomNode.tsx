import { Icon } from '@patternfly/react-core';
import { ArrowDownIcon, ArrowRightIcon, BanIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  AnchorEnd,
  DEFAULT_LAYER,
  DefaultNode,
  DragObjectWithType,
  DragSourceSpec,
  DragSpecOperationType,
  EditableDragOperationType,
  ElementModel,
  GraphElement,
  GraphElementProps,
  isNode,
  LabelBadge,
  Layer,
  Node,
  observer,
  Rect,
  TOP_LAYER,
  useAnchor,
  useCombineRefs,
  useDragNode,
  useHover,
  withContextMenu,
  withDndDrop,
  withSelection,
} from '@patternfly/react-topology';
import clsx from 'clsx';
import { FunctionComponent, useContext, useRef } from 'react';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { AddStepMode, IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { SettingsContext } from '../../../../providers';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode, LayoutType } from '../../Canvas/canvas.models';
import { StepToolbar } from '../../Canvas/StepToolbar/StepToolbar';
import { NodeContextMenuFn } from '../ContextMenu/NodeContextMenu';
import { customNodeDropTargetSpec } from '../customComponentUtils';
import { AddStepIcon } from '../Edge/AddStepIcon';
import { TargetAnchor } from '../target-anchor';
import './CustomNode.scss';

type DefaultNodeProps = Parameters<typeof DefaultNode>[0];

interface CustomNodeProps extends DefaultNodeProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
  /** Toggle node collapse / expand */
  onCollapseToggle?: () => void;
}

const CustomNodeInner: FunctionComponent<CustomNodeProps> = observer(
  ({ element, onContextMenu, onCollapseToggle, dndDropRef, hover, droppable, canDrop, selected, onSelect }) => {
    if (!isNode(element)) {
      throw new Error('CustomNodeInner must be used only on Node elements');
    }

    const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
    const lastUpdate = vizNode?.lastUpdate;
    const entitiesContext = useEntityContext();
    const settingsAdapter = useContext(SettingsContext);
    const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
    const isDisabled = !!vizNode?.getComponentSchema()?.definition?.disabled;
    const tooltipContent = vizNode?.getTooltipContent();
    const validationText = vizNode?.getNodeValidationText();
    const doesHaveWarnings = !isDisabled && !!validationText;
    const [isGHover, gHoverRef] = useHover<SVGGElement>(CanvasDefaults.HOVER_DELAY_IN, CanvasDefaults.HOVER_DELAY_OUT);
    const [isToolbarHover, toolbarHoverRef] = useHover<SVGForeignObjectElement>(
      CanvasDefaults.HOVER_DELAY_IN,
      CanvasDefaults.HOVER_DELAY_OUT,
    );
    const childCount = element.getAllNodeChildren().length;
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

    const nodeDragSourceSpec: DragSourceSpec<
      DragObjectWithType,
      DragSpecOperationType<EditableDragOperationType>,
      GraphElement,
      object,
      GraphElementProps
    > = {
      item: { type: '#node#' },
      begin: () => {
        // Hide all edges when dragging starts
        element
          .getGraph()
          .getEdges()
          .forEach((edge) => {
            edge.setVisible(false);
          });
      },
      canDrag: () => {
        if (settingsAdapter.getSettings().experimentalFeatures.enableDragAndDrop) {
          return element.getData()?.vizNode?.canDragNode();
        } else {
          return false;
        }
      },
      end(dropResult, monitor) {
        if (monitor.didDrop() && dropResult) {
          const draggedNodePath = element.getData().vizNode.data.path;
          dropResult.getData()?.vizNode?.moveNodeTo(draggedNodePath);
          // Set an empty model to clear the graph
          element.getController().fromModel({
            nodes: [],
            edges: [],
          });

          requestAnimationFrame(() => {
            entitiesContext.updateEntitiesFromCamelResource();
          });
        } else {
          // Show all edges after dropping
          element
            .getGraph()
            .getEdges()
            .forEach((edge) => {
              edge.setVisible(true);
            });
          element.getGraph().layout();
        }
      },
    };

    const [_, dragNodeRef] = useDragNode(nodeDragSourceSpec);
    const gCombinedRef = useCombineRefs<SVGGElement>(gHoverRef, dragNodeRef);

    if (!droppable || !boxRef.current) {
      boxRef.current = element.getBounds();
    }
    const labelX = (boxRef.current.width - CanvasDefaults.DEFAULT_LABEL_WIDTH) / 2;
    const toolbarWidth = CanvasDefaults.STEP_TOOLBAR_WIDTH;
    const toolbarX = (boxRef.current.width - toolbarWidth) / 2;
    const toolbarY = CanvasDefaults.STEP_TOOLBAR_HEIGHT * -1;

    if (!vizNode) {
      return null;
    }

    return (
      <Layer id={DEFAULT_LAYER} data-lastupdate={lastUpdate}>
        <g
          ref={gCombinedRef}
          className="custom-node"
          data-testid={`custom-node__${vizNode.id}`}
          data-nodelabel={label}
          data-selected={selected}
          data-disabled={isDisabled}
          data-toolbar-open={shouldShowToolbar}
          data-warning={doesHaveWarnings}
          onClick={onSelect}
          onContextMenu={onContextMenu}
        >
          <foreignObject
            data-nodelabel={label}
            width={boxRef.current.width}
            height={boxRef.current.height}
            ref={dndDropRef}
          >
            <div
              className={clsx('custom-node__container', {
                'custom-node__container__dropTarget': canDrop && hover,
              })}
            >
              <div title={tooltipContent} className="custom-node__container__image">
                <img alt={tooltipContent} src={vizNode.data.icon} />

                {isDisabled && (
                  <Icon className="disabled-step-icon" status="danger" size="lg">
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
                <Icon status="danger" title={validationText} data-warning={doesHaveWarnings}>
                  <ExclamationCircleIcon />
                </Icon>
              )}
              <span title={label}>{label}</span>
            </div>
          </foreignObject>

          {!droppable && shouldShowToolbar && (
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

          {!droppable && shouldShowAddStep && (
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
  },
);

const CustomNode: FunctionComponent<CustomNodeProps> = ({ element, ...rest }: CustomNodeProps) => {
  if (!isNode(element)) {
    throw new Error('CustomNode must be used only on Node elements');
  }
  return <CustomNodeInner element={element} {...rest} />;
};

export const CustomNodeObserver = observer(CustomNode);

export const CustomNodeWithSelection = withSelection()(
  withDndDrop(customNodeDropTargetSpec)(withContextMenu(NodeContextMenuFn)(CustomNode)),
);
