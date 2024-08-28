import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { MappingTree } from '../../models/mapping';

export interface DnDHandler {
  handleDragStart(event: DragStartEvent): void;
  handleDragOver(event: DragOverEvent): void;
  handleDragEnd(event: DragEndEvent, mappingTree: MappingTree, onUpdate: () => void): void;
}
