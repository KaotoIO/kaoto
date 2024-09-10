import { CSSProperties, forwardRef, FunctionComponent, PropsWithChildren } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { NodeData } from '../../models/datamapper/visualization';

type DnDContainerProps = PropsWithChildren & {
  nodeData: NodeData;
};

type BaseContainerProps = PropsWithChildren & {
  id: string;
  nodeData: NodeData;
};

export const DroppableContainer: FunctionComponent<BaseContainerProps> = ({ id, nodeData, children }) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `droppable-${id}`,
    data: nodeData,
  });
  const droppableStyle = {
    color: isOver ? 'var(--pf-v5-global--primary-color--200)' : undefined,
    borderWidth: isOver ? 'thin' : undefined,
    borderStyle: isOver ? 'dashed' : undefined,
    borderColor: isOver ? 'var(--pf-v5-global--primary-color--200)' : undefined,
    backgroundColor: isOver ? 'var(--pf-v5-global--palette--blue-50)' : undefined,
    height: '100%',
  } as CSSProperties;
  return (
    <div id={`droppable-${id}`} ref={setDroppableNodeRef} style={droppableStyle}>
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

  const draggableStyle = transform
    ? ({
        fontWeight: 'bold',
        color: 'var(--pf-v5-global--primary-color--100)',
        borderWidth: 'thin',
        borderStyle: 'solid',
        borderColor: 'var(--pf-v5-global--primary-color--200)',
        backgroundColor: 'var(--pf-v5-global--palette--black-200)',
      } as CSSProperties)
    : undefined;

  return (
    <div id={`draggable-${id}`} ref={setDraggableNodeRef} style={draggableStyle} {...listeners} {...attributes}>
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
  return nodeData ? (
    <div ref={forwardedRef}>
      <DnDContainer nodeData={nodeData}>{children}</DnDContainer>
    </div>
  ) : (
    <div ref={forwardedRef}>{children}</div>
  );
});
