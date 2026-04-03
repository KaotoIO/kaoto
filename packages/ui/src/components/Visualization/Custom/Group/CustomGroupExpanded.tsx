import './CustomGroupExpanded.scss';

import { Icon } from '@patternfly/react-core';
import { BanIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  AnchorEnd,
  DEFAULT_LAYER,
  DragEvent,
  DragObjectWithType,
  DragSourceSpec,
  DragSpecOperationType,
  DropTargetSpec,
  EditableDragOperationType,
  GraphElement,
  GraphElementProps,
  GROUPS_LAYER,
  isNode,
  Layer,
  Node,
  observer,
  Rect,
  TOP_LAYER,
  useAnchor,
  useCombineRefs,
  useDndDrop,
  useDragNode,
  useHover,
} from '@patternfly/react-topology';
import clsx from 'clsx';
import { FunctionComponent, useContext, useMemo, useRef } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { useProcessorIcon } from '../../../../hooks/processor-icon.hook';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { AddStepMode, IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { SettingsContext } from '../../../../providers';
import { IconResolver } from '../../../IconResolver';
import { Anchors } from '../../../registers/anchors';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { RenderingAnchor } from '../../../RenderingAnchor/RenderingAnchor';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { StepToolbar } from '../../Canvas/StepToolbar/StepToolbar';
import {
  canDragGroup,
  getDropTargetContainerClassNames,
  GROUP_DRAG_TYPE,
  NODE_DRAG_TYPE,
} from '../customComponentUtils';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';
import { CustomNodeContainer } from '../Node/CustomNodeContainer';
import { checkNodeDropCompatibility, getNodeDragAndDropDirection, handleValidNodeDrop } from '../Node/CustomNodeUtils';
import { TargetAnchor } from '../target-anchor';
import { CustomGroupProps } from './Group.models';

export const CustomGroupExpandedInner: FunctionComponent<CustomGroupProps> = observer(
  ({ element, onContextMenu, onCollapseToggle, selected, onSelect }) => {
    if (!isNode(element)) {
      throw new Error('CustomGroupExpanded must be used only on Node elements');
    }

    const groupVizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
    const lastUpdate = groupVizNode?.lastUpdate;
    const settingsAdapter = useContext(SettingsContext);
    const entitiesContext = useEntityContext();
    const catalogModalContext = useContext(CatalogModalContext);
    const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);
    const label = groupVizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
    const processorName = (groupVizNode?.data as CamelRouteVisualEntityData)?.processorName;
    const { Icon: ProcessorIcon, description: processorDescription } = useProcessorIcon(processorName);
    const isDisabled = !!groupVizNode?.getNodeDefinition()?.disabled;
    const validationText = groupVizNode?.getNodeValidationText();
    const doesHaveWarnings = !isDisabled && !!validationText;
    const tooltipContent = groupVizNode?.getTooltipContent();
    const childCount = element.getAllNodeChildren().length;
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

    useAnchor((element: Node) => {
      return new TargetAnchor(element);
    }, AnchorEnd.both);

    if (!groupVizNode) {
      return null;
    }

    const groupDragSourceSpec: DragSourceSpec<
      DragObjectWithType,
      DragSpecOperationType<EditableDragOperationType>,
      GraphElement,
      { node: GraphElement | undefined; dragEvent: DragEvent | undefined },
      GraphElementProps
    > = useMemo(
      () => ({
        item: { type: GROUP_DRAG_TYPE },
        canDrag: () => {
          return canDragGroup(groupVizNode);
        },
        end(dropResult, monitor) {
          if (monitor.didDrop() && dropResult) {
            // handle successful drop
            handleValidNodeDrop(element, dropResult, entitiesContext, nodeInteractionAddonContext);
          } else {
            element.getGraph().layout();
          }
        },
        collect: (monitor) => ({
          node: monitor.getItem(),
          dragEvent: monitor.getDragEvent(),
        }),
      }),
      [element, entitiesContext, groupVizNode, nodeInteractionAddonContext],
    );

    const customGroupExpandedDropTargetSpec: DropTargetSpec<
      GraphElement,
      unknown,
      { droppable: boolean; hover: boolean; canDrop: boolean },
      GraphElementProps
    > = useMemo(
      () => ({
        accept: [NODE_DRAG_TYPE, GROUP_DRAG_TYPE],
        canDrop: (item, _monitor, _props) => {
          // Ensure that the node is not dropped onto itself
          if ((item as Node) === element) return false;

          return checkNodeDropCompatibility(
            item.getData()?.vizNode,
            groupVizNode,
            (mode: AddStepMode, filterNode: IVisualizationNode, compatibilityCheckNodeName: string) => {
              const filter = entitiesContext.camelResource.getCompatibleComponents(
                mode,
                filterNode.data,
                filterNode.getNodeDefinition(),
              );
              return catalogModalContext?.checkCompatibility(compatibilityCheckNodeName, filter) ?? false;
            },
          );
        },
        drop: (_item, monitor, _props) => {
          if (monitor.isOver({ shallow: true })) {
            return element;
          }
        },
        collect: (monitor) => ({
          droppable: monitor.isDragging(),
          hover: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [catalogModalContext, element, entitiesContext.camelResource, groupVizNode],
    );

    const [dragGroupProps, dragGroupRef] = useDragNode(groupDragSourceSpec);
    const [dndDropProps, dndDropRef] = useDndDrop(customGroupExpandedDropTargetSpec);
    const draggedVizNode = dragGroupProps.node?.getData().vizNode;
    const isDraggingGroup = dragGroupProps.node?.getId() === element.getId();
    const refreshGroup =
      draggedVizNode?.getId() === element.getData().vizNode.getId() &&
      element.getData().vizNode.data.path.slice(0, draggedVizNode?.data.path.length) === draggedVizNode?.data.path;
    const gCombinedRef = useCombineRefs<SVGGElement>(gHoverRef, dragGroupRef);

    const dropDirection: 'forward' | 'backward' | null =
      dndDropProps.droppable && dndDropProps.canDrop && draggedVizNode
        ? getNodeDragAndDropDirection(draggedVizNode, groupVizNode, false)
        : null;

    const mainContainerClassNames = {
      [`custom-group__container__draggedGroup`]: isDraggingGroup || refreshGroup,
      ...getDropTargetContainerClassNames('custom-group__container', dropDirection, dndDropProps.hover),
    };

    const box = element.getBounds();
    if (!dndDropProps.droppable || !boxRef.current) {
      boxRef.current = box;
    }

    const toolbarX = boxRef.current.x + (boxRef.current.width - CanvasDefaults.STEP_TOOLBAR_WIDTH) / 2;
    const toolbarY = boxRef.current.y - CanvasDefaults.STEP_TOOLBAR_HEIGHT;

    return (
      <Layer id={refreshGroup ? DEFAULT_LAYER : GROUPS_LAYER} data-lastupdate={lastUpdate}>
        <g
          ref={gCombinedRef}
          className="custom-group"
          data-testid={`custom-group__${groupVizNode.id}`}
          data-grouplabel={label}
          data-selected={selected}
          data-disabled={isDisabled}
          data-toolbar-open={shouldShowToolbar}
          data-warnings={doesHaveWarnings}
          onClick={onSelect}
          onContextMenu={onContextMenu}
        >
          {/** This node appears when nothing is dragging and acts as the dummy node when container is dragged*/}
          <foreignObject
            ref={dndDropRef}
            data-nodelabel={label}
            x={boxRef.current.x}
            y={boxRef.current.y}
            width={boxRef.current.width}
            height={boxRef.current.height}
          >
            <div
              data-testid={`${groupVizNode.getId()}|${groupVizNode.id}`}
              className={clsx('custom-group__container', mainContainerClassNames)}
            >
              <div className="custom-group__container__text" title={tooltipContent}>
                {doesHaveWarnings ? (
                  <div className="custom-group__container__icon-placeholder" />
                ) : (
                  <IconResolver
                    alt={tooltipContent}
                    catalogKind={groupVizNode.data.catalogKind}
                    name={groupVizNode.data.name}
                  />
                )}
                <span title={label}>{label}</span>

                <RenderingAnchor anchorTag={Anchors.CanvasGroupTitlebar} vizNode={groupVizNode} />
              </div>

              {isDisabled && !doesHaveWarnings && (
                <Icon className="custom-group__disabled-icon" title="Step disabled">
                  <BanIcon />
                </Icon>
              )}
            </div>
          </foreignObject>

          {/** This is the dragged node which is being moved */}
          {dndDropProps.droppable && isDraggingGroup && (
            <CustomNodeContainer
              width={CanvasDefaults.DEFAULT_NODE_WIDTH}
              height={CanvasDefaults.DEFAULT_NODE_HEIGHT}
              dataNodelabel={label}
              transform={`translate(${dragGroupProps.dragEvent!.x - 20}, ${dragGroupProps.dragEvent!.y - 20})`}
              dataTestId={groupVizNode.id}
              vizNode={groupVizNode}
              tooltipContent={tooltipContent}
              childCount={childCount}
              containerClassNames={{
                'custom-node__container__draggedNode': true,
              }}
              ProcessorIcon={ProcessorIcon}
              processorDescription={processorDescription}
              isDisabled={isDisabled}
            />
          )}

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
          {!dndDropProps.droppable && shouldShowToolbar && (
            <Layer id={TOP_LAYER}>
              <foreignObject
                ref={toolbarHoverRef}
                className="custom-group__toolbar"
                x={toolbarX}
                y={toolbarY}
                width={CanvasDefaults.STEP_TOOLBAR_WIDTH}
                height={CanvasDefaults.STEP_TOOLBAR_HEIGHT}
              >
                <StepToolbar
                  data-testid="step-toolbar"
                  vizNode={groupVizNode}
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

export const CustomGroupExpanded = CustomGroupExpandedInner;
