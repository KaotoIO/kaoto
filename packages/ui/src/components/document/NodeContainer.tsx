import { CSSProperties, forwardRef, FunctionComponent, PropsWithChildren } from 'react';
import { IField } from '../../models/document';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface NodeContainerProps extends PropsWithChildren {
  dndId?: string;
  field?: IField;
}

const DnDContainer: FunctionComponent<NodeContainerProps> = ({ dndId, field, children }) => {
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: 'droppable-' + dndId,
    data: field,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
  } = useDraggable({
    id: 'draggable-' + dndId,
    data: field,
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
    <div id={'droppable-' + dndId} ref={setDroppableNodeRef} style={droppableStyle}>
      <div id={'draggable-' + dndId} ref={setDraggableNodeRef} style={draggableStyle} {...listeners} {...attributes}>
        {children}
      </div>
    </div>
  );
};

export const NodeContainer = forwardRef<HTMLDivElement, NodeContainerProps>(
  ({ children, dndId, field }, forwardedRef) => {
    return dndId && field ? (
      <div ref={forwardedRef}>
        <DnDContainer dndId={dndId} field={field}>
          {children}
        </DnDContainer>
      </div>
    ) : (
      <div ref={forwardedRef}>{children}</div>
    );
  },
);
