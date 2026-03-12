import './NodeContainer.scss';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { isDefined } from '@kaoto/forms';
import clsx from 'clsx';
import { forwardRef, FunctionComponent, PropsWithChildren, useContext, useMemo } from 'react';

import { DocumentNodeData, NodeData } from '../../models/datamapper/visualization';
import { DataMapperDndContext } from '../../providers/datamapper-dnd.provider';
import { MappingValidationService } from '../../services/mapping-validation.service';
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
  const { activeNode } = useContext(DataMapperDndContext);

  const isInvalidDrop = useMemo(() => {
    if (!activeNode) return false;
    if (activeNode.isSource === nodeData.isSource) return false;
    return !MappingValidationService.validateMappingPair(activeNode, nodeData).isValid;
  }, [activeNode, nodeData]);

  // unlike `isInvalidDrop` which shows disabled hover effect and show an error toast if it's dropped,
  // if it's same side (source<->source / target<->target), disable DnDKit to show no hover effect
  // nor error, but just silently ignore it
  const isSameSide = !!activeNode && activeNode.isSource === nodeData.isSource;

  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `droppable-${id}`,
    data: nodeData,
    disabled: isSameSide,
  });

  return (
    <div
      id={`droppable-${id}`}
      ref={setDroppableNodeRef}
      className={clsx(
        className,
        { 'droppable-container': isOver && !isInvalidDrop },
        { 'droppable-invalid': isOver && isInvalidDrop },
        'pf-v6-c-droppable',
      )}
      data-dnd-droppable={isOver ? `${id}` : undefined}
    >
      {children}
    </div>
  );
};

export const DraggableContainer: FunctionComponent<BaseContainerProps> = ({ id, nodeData, children }) => {
  const {
    isDragging,
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
      data-dnd-draggable={isDragging ? `${id}` : undefined}
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
  className?: string;
  nodeData?: NodeData;
  enableDnD?: boolean;
};

export const NodeContainer = forwardRef<HTMLDivElement, NodeContainerProps>(
  ({ children, className, nodeData, enableDnD = true }, forwardedRef) => {
    return enableDnD && nodeData && !(nodeData instanceof DocumentNodeData && !nodeData.isPrimitive) ? (
      <div ref={forwardedRef} className={className}>
        <DnDContainer nodeData={nodeData}>{children}</DnDContainer>
      </div>
    ) : (
      <div ref={forwardedRef} className={className}>
        {children}
      </div>
    );
  },
);
