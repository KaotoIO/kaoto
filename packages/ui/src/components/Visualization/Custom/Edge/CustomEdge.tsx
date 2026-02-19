import './CustomEdge.scss';

import { Icon } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import {
  ConnectorArrow,
  DefaultEdge,
  DropTargetSpec,
  EdgeModel,
  getClosestVisibleParent,
  GraphElement,
  GraphElementProps,
  isEdge,
  Layer,
  observer,
  Point,
  TOP_LAYER,
  useDndDrop,
} from '@patternfly/react-topology';
import { clsx } from 'clsx';
import { FunctionComponent, useContext, useMemo, useRef } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { AddStepMode, IVisualizationNode } from '../../../../models';
import { LayoutType } from '../../Canvas';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { canDropOnEdge, GROUP_DRAG_TYPE, NODE_DRAG_TYPE } from '../customComponentUtils';
import { AddStepIcon } from './AddStepIcon';

type DefaultEdgeProps = Parameters<typeof DefaultEdge>[0];

interface EdgeAddStepIconSlotProps {
  x: number;
  y: number;
  vizNode: IVisualizationNode;
  className?: string;
}

const EdgeAddStepIconSlot: FunctionComponent<EdgeAddStepIconSlotProps> = ({ x, y, vizNode, className }) => (
  <foreignObject x={x} y={y} width={CanvasDefaults.ADD_STEP_ICON_SIZE} height={CanvasDefaults.ADD_STEP_ICON_SIZE}>
    <AddStepIcon className={className} title="Add step" vizNode={vizNode} mode={AddStepMode.PrependStep}>
      <Icon size="lg">
        <PlusCircleIcon />
      </Icon>
    </AddStepIcon>
  </foreignObject>
);

interface CustomEdgeProps extends DefaultEdgeProps {
  /** We're not providing Data to edges */
  element: GraphElement<EdgeModel, unknown>;
}

export const CustomEdge: FunctionComponent<CustomEdgeProps> = observer(({ element }) => {
  if (!isEdge(element)) {
    throw new Error('EdgeEndWithButton must be used only on Edge elements');
  }

  const entitiesContext = useEntityContext();
  const catalogModalContext = useContext(CatalogModalContext)!;
  const edgeDRef = useRef<string | null>(null);
  const startPointRef = useRef<Point | null>(null);
  const endPointRef = useRef<Point | null>(null);

  const customNodeDropTargetSpec: DropTargetSpec<
    GraphElement,
    unknown,
    {
      droppable: boolean;
      hover: boolean;
      canDrop: boolean;
      dragItemType: string | undefined;
      dragItem: GraphElement | undefined;
    },
    GraphElementProps
  > = useMemo(
    () => ({
      accept: [NODE_DRAG_TYPE, GROUP_DRAG_TYPE],
      canDrop: (item, _monitor, _props) =>
        canDropOnEdge(item.getData().vizNode, element, entitiesContext.camelResource, catalogModalContext),
      collect: (monitor) => ({
        droppable: monitor.isDragging(),
        dragItemType: monitor.getItemType(),
        dragItem: monitor.getItem(),
        hover: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [catalogModalContext, element, entitiesContext.camelResource],
  );

  const [dndDropProps, dndDropRef] = useDndDrop(customNodeDropTargetSpec);
  const dragItemType = dndDropProps.dragItemType;
  const dragItem = dndDropProps.dragItem;
  const edgeSourceParent = element.getSource().getParent()?.getId();
  const edgeTargetParent = element.getTarget().getParent()?.getId();
  const refreshEdge =
    dragItemType === GROUP_DRAG_TYPE &&
    edgeSourceParent.slice(0, dragItem?.getId().length) === dragItem?.getId() &&
    edgeTargetParent.slice(0, dragItem?.getId().length) === dragItem?.getId();

  /* If the edge connects to nodes in a collapsed group don't draw */
  const sourceParent = getClosestVisibleParent(element.getSource());
  const targetParent = getClosestVisibleParent(element.getTarget());
  if (sourceParent?.isCollapsed() && sourceParent === targetParent) {
    return null;
  }

  const startPoint = element.getStartPoint();
  const endPoint = element.getEndPoint();
  const isHorizontal = element.getGraph().getLayout() === LayoutType.DagreHorizontal;

  let x = startPoint.x + (endPoint.x - startPoint.x - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2;
  let y = startPoint.y + (endPoint.y - startPoint.y - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2;
  if (isHorizontal) {
    /** If the layout is horizontal, we need to pull the AddStepIcon to the left to substract the edge connector width */
    x -= 6;
  } else if (element.getSource().isGroup()) {
    /** If the edge starts from a group, we need to pull the AddStepIcon to the top to substract the edge connector height */
    y -= 6;
  } else {
    /** If the edge starts from a node, we need to push the AddStepIcon to the bottom to save the node label */
    y += 4;
  }

  const vizNode: IVisualizationNode | undefined = element.getTarget().getData()?.vizNode;
  const shouldShowPrepend = !vizNode?.data.isPlaceholder && vizNode?.getNodeInteraction().canHavePreviousStep;

  const bendPoints = element
    .getBendpoints()
    .concat(endPoint)
    .map((b: Point) => `L${b.x} ${b.y}`)
    .join(' ');
  const d = `M${startPoint.x} ${startPoint.y} ${bendPoints}`;
  if (!dndDropProps.droppable || !edgeDRef.current || !startPointRef.current || !endPointRef.current) {
    edgeDRef.current = d;
    startPointRef.current = startPoint;
    endPointRef.current = endPoint;
  }

  return (
    <Layer id={refreshEdge ? TOP_LAYER : undefined}>
      <g className="custom-edge" ref={dndDropRef}>
        <path className="custom-edge__background" d={edgeDRef.current} />
        <path
          className={clsx('custom-edge__body', {
            'custom-edge__body__validDropTarget': dndDropProps.droppable && dndDropProps.hover && dndDropProps.canDrop,
            'custom-edge__body__possibleDropTargets':
              dndDropProps.canDrop && dndDropProps.droppable && !dndDropProps.hover,
          })}
          d={edgeDRef.current}
        />
        <ConnectorArrow
          isTarget
          className={clsx('custom-edge__connector', {
            'custom-edge__connector__validDropTarget':
              dndDropProps.droppable && dndDropProps.hover && dndDropProps.canDrop,
            'custom-edge__connector__possibleDropTargets':
              dndDropProps.canDrop && dndDropProps.droppable && !dndDropProps.hover,
          })}
          startPoint={startPointRef.current}
          endPoint={endPointRef.current}
        />

        {/** Add Step Icon, appears when nothing is dragging and user hovers over the edge */}
        {!dndDropProps.droppable && shouldShowPrepend && (
          <EdgeAddStepIconSlot x={x} y={y} vizNode={vizNode} className="custom-edge__add-step" />
        )}

        {/** Add Step Icon, appears when a compatible node/group is being dragged over the edge */}
        {dndDropProps.droppable && shouldShowPrepend && dndDropProps.hover && dndDropProps.canDrop && (
          <EdgeAddStepIconSlot
            x={
              startPointRef.current.x +
              (endPointRef.current.x - startPointRef.current.x - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2
            }
            y={
              startPointRef.current.y +
              (endPointRef.current.y - startPointRef.current.y - CanvasDefaults.ADD_STEP_ICON_SIZE) / 2
            }
            vizNode={vizNode}
            className="add-step-icon__icon__validDropTarget"
          />
        )}
      </g>
    </Layer>
  );
});
