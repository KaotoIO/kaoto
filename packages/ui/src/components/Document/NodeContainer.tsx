import { CSSProperties, forwardRef, FunctionComponent, PropsWithChildren } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { NodeData } from '../../models/datamapper/visualization';

type DnDContainerProps = PropsWithChildren & {
  nodeData: NodeData;
};

const DnDContainer: FunctionComponent<DnDContainerProps> = ({ nodeData, children }) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: 'droppable-' + nodeData.id,
    data: nodeData,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
  } = useDraggable({
    id: 'draggable-' + nodeData.id,
    data: nodeData,
  });

  const droppableStyle = {
    color: isOver ? 'var(--pf-v5-global--primary-color--200)' : undefined,
    fontWeight: isOver ? 'bold' : undefined,
    backgroundColor: isOver ? 'var(--pf-v5-global--palette--blue-50)' : undefined,
  } as CSSProperties;
  const draggableStyle = transform
    ? ({
        fontWeight: 'bold',
        color: 'var(--pf-v5-global--primary-color--100)',
        backgroundColor: 'var(--pf-v5-global--palette--black-200)',
      } as CSSProperties)
    : undefined;

  return (
    <div id={'droppable-' + nodeData.id} ref={setDroppableNodeRef} style={droppableStyle}>
      <div
        id={'draggable-' + nodeData.id}
        ref={setDraggableNodeRef}
        style={draggableStyle}
        {...listeners}
        {...attributes}
      >
        {children}
      </div>
    </div>
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
