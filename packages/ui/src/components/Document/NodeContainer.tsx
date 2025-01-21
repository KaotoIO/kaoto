import { useDraggable, useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { forwardRef, FunctionComponent, PropsWithChildren } from 'react';
import { DocumentNodeData, NodeData } from '../../models/datamapper/visualization';
import { isDefined } from '../../utils';
import './NodeContainer.scss';
import { VisualizationService } from '../../services/visualization.service';

type DnDContainerProps = PropsWithChildren & {
  nodeData: NodeData;
};

type BaseContainerProps = PropsWithChildren & {
  className?: string;
  id: string;
  nodeData: NodeData;
};

export const DroppableContainer: FunctionComponent<BaseContainerProps> = ({ className, id, nodeData, children }) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `droppable-${id}`,
    data: nodeData,
  });

  return (
    <div
      id={`droppable-${id}`}
      ref={setDroppableNodeRef}
      className={clsx(className, { 'droppable-container': isOver }, 'pf-v6-c-droppable')}
    >
      {children}
    </div>
  );
};

export const DraggableContainer: FunctionComponent<BaseContainerProps> = ({ id, nodeData, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
  } = useDraggable({
    id: `draggable-${id}`,
    data: nodeData,
  });

  return (
    <div
      id={`draggable-${id}`}
      ref={setDraggableNodeRef}
      className={clsx({ 'draggable-container': isDefined(transform) }, 'pf-v6-c-draggable')}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};

const DnDContainer: FunctionComponent<DnDContainerProps> = ({ nodeData, children }) => {
  const dndId = VisualizationService.generateDndId(nodeData);
  return (
    <DroppableContainer id={dndId} nodeData={nodeData}>
      <DraggableContainer id={dndId} nodeData={nodeData}>
        {children}
      </DraggableContainer>
    </DroppableContainer>
  );
};

type NodeContainerProps = PropsWithChildren & {
  nodeData?: NodeData;
};

export const NodeContainer = forwardRef<HTMLDivElement, NodeContainerProps>(({ children, nodeData }, forwardedRef) => {
  return nodeData && !(nodeData instanceof DocumentNodeData && !nodeData.isPrimitive) ? (
    <div ref={forwardedRef}>
      <DnDContainer nodeData={nodeData}>{children}</DnDContainer>
    </div>
  ) : (
    <div ref={forwardedRef}>{children}</div>
  );
});
