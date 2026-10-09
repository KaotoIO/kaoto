import './CustomGroupExpanded.scss';

import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';
import { Icon } from '@patternfly/react-core';
import { BanIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  AnchorEnd,
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
  useDndDrop,
  useDragNode,
  useHover,
} from '@patternfly/react-topology';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useContext, useMemo, useRef } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { AddStepMode, IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { SettingsContext } from '../../../../providers';
import { getProcessorIcon } from '../../../../utils/processor-icon';
import { Anchors } from '../../../registers/anchors';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { RenderingAnchor } from '../../../RenderingAnchor/RenderingAnchor';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { StepToolbarOverlay } from '../../Canvas/StepToolbar/StepToolbarOverlay';
import {
  canDragGroup,
  getDropTargetContainerClassNames,
  GROUP_DRAG_TYPE,
  NODE_DRAG_TYPE,
} from '../customComponentUtils';
import { FloatingCircle } from '../FloatingCircle/FloatingCircle';
import { useNodeValidationText } from '../hooks/use-node-validation-text.hook';
import { CustomNodeContainer } from '../Node/CustomNodeContainer';
import {
  checkNodeDropCompatibility,
  getNodeDragAndDropDirection,
  getVizNodeChildrenInfo,
  handleValidNodeDrop,
} from '../Node/CustomNodeUtils';
import { TargetAnchor } from '../target-anchor';
import { CustomGroupProps } from './Group.models';

// The 3px stroke is centered 2px outside the group, matching the former HTML outline.
const FOCUS_RING_OFFSET = 3.5;
// Keep shadows inside a clipped foreignObject so WebKit repaints their old bounds.
const GROUP_PAINT_PADDING = 24;

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
    const processorName = groupVizNode?.data.primaryNodeId?.name as keyof ProcessorDefinition;
    const ProcessorIcon = getProcessorIcon(processorName);
    const processorDescription = groupVizNode?.data?.processorIconTooltip ?? '';
    const isDisabled = !!(groupVizNode?.data?.definition as { disabled?: unknown } | undefined)?.disabled;
    const validationText = useNodeValidationText(groupVizNode);
    const doesHaveWarnings = !isDisabled && !!validationText;
    const { childCount, hasGroupChildren } = getVizNodeChildrenInfo(groupVizNode);
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

    // handleKeyDown must be declared before any early return to satisfy Rules of Hooks
    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<SVGGElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(event as unknown as React.MouseEvent);
        } else if ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu') {
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect?.() ?? { left: 0, bottom: 0 };
          onContextMenu?.({
            preventDefault: () => {},
            stopPropagation: () => {},
            clientX: rect.left,
            clientY: rect.bottom,
            currentTarget: event.currentTarget,
          } as unknown as React.MouseEvent);
        }
      },
      [onContextMenu, onSelect],
    );

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
                filterNode.data?.definition,
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
    const draggedVizNodePath = draggedVizNode?.data.path;
    const isDraggingGroup = dragGroupProps.node?.getId() === element.getId();
    const refreshGroup =
      draggedVizNode?.getId() === element.getData().vizNode.getId() &&
      isDefined(draggedVizNodePath) &&
      element.getData().vizNode.data.path.startsWith(draggedVizNodePath + '.');

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

    return (
      <Layer id={GROUPS_LAYER} data-lastupdate={lastUpdate}>
        <g
          ref={gHoverRef}
          className="custom-group"
          data-testid={`custom-group__${groupVizNode.id}`}
          data-grouplabel={label}
          data-selected={selected}
          data-disabled={isDisabled}
          data-toolbar-open={shouldShowToolbar}
          data-warnings={doesHaveWarnings}
          tabIndex={selected ? 0 : -1}
          role="button"
          aria-label={label ?? groupVizNode.id}
          aria-pressed={selected}
          onClick={onSelect}
          onKeyDown={handleKeyDown}
          onContextMenu={onContextMenu}
        >
          <rect
            className="custom-group__focus-ring"
            aria-hidden="true"
            x={boxRef.current.x - FOCUS_RING_OFFSET}
            y={boxRef.current.y - FOCUS_RING_OFFSET}
            width={boxRef.current.width + 2 * FOCUS_RING_OFFSET}
            height={boxRef.current.height + 2 * FOCUS_RING_OFFSET}
          />
          <rect
            ref={dndDropRef}
            className="custom-group__drop-area"
            aria-hidden="true"
            x={boxRef.current.x}
            y={boxRef.current.y}
            width={boxRef.current.width}
            height={boxRef.current.height}
            fill="none"
            pointerEvents="none"
          />
          {/** This node appears when nothing is dragging and acts as the dummy node when container is dragged*/}
          <foreignObject
            className="custom-group__body"
            opacity={isDraggingGroup || refreshGroup ? 0.5 : undefined}
            data-nodelabel={label}
            x={boxRef.current.x - GROUP_PAINT_PADDING}
            y={boxRef.current.y - GROUP_PAINT_PADDING}
            width={boxRef.current.width + 2 * GROUP_PAINT_PADDING}
            height={boxRef.current.height + 2 * GROUP_PAINT_PADDING}
          >
            <div className="custom-group__paint-area" style={{ padding: GROUP_PAINT_PADDING }}>
              <div
                data-testid={`${groupVizNode.getId()}|${groupVizNode.id}`}
                className={clsx('custom-group__container', mainContainerClassNames)}
              >
                <div
                  ref={dragGroupRef}
                  data-testid={`${groupVizNode.getId()}|${groupVizNode.id}|drag-handle`}
                  className={clsx('custom-group__container__text', {
                    'custom-group__container__text__draggable': canDragGroup(groupVizNode),
                  })}
                  title={groupVizNode.data.description}
                >
                  {doesHaveWarnings ? (
                    <div className="custom-group__container__icon-placeholder" />
                  ) : (
                    groupVizNode.data.iconUrl && (
                      <img
                        src={groupVizNode.data.iconUrl}
                        alt={
                          groupVizNode.data.description ||
                          (typeof groupVizNode.data.iconAlt === 'string' ? groupVizNode.data.iconAlt : '')
                        }
                      />
                    )
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
            </div>
          </foreignObject>

          {/** This is the dragged node which is being moved */}
          {dndDropProps.droppable && isDraggingGroup && (
            <Layer id={TOP_LAYER}>
              <CustomNodeContainer
                width={CanvasDefaults.DEFAULT_NODE_WIDTH}
                height={CanvasDefaults.DEFAULT_NODE_HEIGHT}
                dataNodelabel={label}
                transform={`translate(${dragGroupProps.dragEvent!.x - 20}, ${dragGroupProps.dragEvent!.y - 20})`}
                dataTestId={groupVizNode.id}
                vizNode={groupVizNode}
                isCollapsed={element.isCollapsed()}
                childCount={childCount}
                hasGroupChildren={hasGroupChildren}
                containerClassNames={{
                  'custom-node__container__draggedNode': true,
                  'custom-node__container__grabbing-cursor': true,
                }}
                ProcessorIcon={ProcessorIcon}
                processorDescription={processorDescription}
                isDisabled={isDisabled}
                isDragging
              />
            </Layer>
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
              <StepToolbarOverlay
                foreignObjectRef={toolbarHoverRef}
                className="custom-group__toolbar"
                centerX={boxRef.current.x + boxRef.current.width / 2}
                bottomY={boxRef.current.y}
                data-testid="step-toolbar"
                vizNode={groupVizNode}
                isCollapsed={element.isCollapsed()}
                onCollapseToggle={onCollapseToggle}
              />
            </Layer>
          )}
        </g>
      </Layer>
    );
  },
);

export const CustomGroupExpanded = CustomGroupExpandedInner;
