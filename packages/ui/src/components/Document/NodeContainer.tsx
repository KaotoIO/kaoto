import { useDraggable, useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { forwardRef, FunctionComponent, PropsWithChildren } from 'react';
import { DocumentNodeData, NodeData } from '../../models/datamapper/visualization';
import { isDefined } from '../../utils';
import './NodeContainer.scss';

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
      className={clsx(className, { 'droppable-container': isOver })}
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
      className={clsx({ 'draggable-container': isDefined(transform) })}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};

const DnDContainer: FunctionComponent<DnDContainerProps> = ({ nodeData, children }) => {
  return (
    <DroppableContainer id={nodeData.id} nodeData={nodeData}>
      <DraggableContainer id={nodeData.id} nodeData={nodeData}>
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
