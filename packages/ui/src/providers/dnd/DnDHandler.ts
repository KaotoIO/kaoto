import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { MappingTree } from '../../models/mapping';

export interface DnDHandler {
  handleDragStart(event: DragStartEvent): void;
  handleDragEnd(event: DragEndEvent, mappingTree: MappingTree, onUpdate: () => void): void;
}
