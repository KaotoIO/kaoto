import { DnDHandler } from './DnDHandler';
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

export class ExpressionEditorDnDHandler implements DnDHandler {
  handleDragEnd(_event: DragEndEvent): void {}
  handleDragOver(_event: DragOverEvent): void {}
  handleDragStart(_event: DragStartEvent): void {}
}
