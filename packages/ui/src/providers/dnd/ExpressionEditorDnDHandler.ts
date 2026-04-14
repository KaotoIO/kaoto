import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

import { EditorNodeData, FieldNodeData, FunctionNodeData, MappingTree, NodeData } from '../../models/datamapper';
import { MappingService } from '../../services/mapping.service';
import { DnDHandler, DnDResult } from './DnDHandler';

export class ExpressionEditorDnDHandler implements DnDHandler {
  handleDragEnd(event: DragEndEvent, _mappingTree: MappingTree, onUpdate: () => void): DnDResult {
    const fromNode = event.active.data.current as NodeData;
    const toNode = event.over?.data.current as NodeData;
    if (
      !fromNode ||
      !toNode ||
      (!(fromNode instanceof FunctionNodeData) && !(fromNode instanceof FieldNodeData)) ||
      !(toNode instanceof EditorNodeData)
    ) {
      return { success: false };
    }
    const editorNodeData = toNode;
    if (fromNode instanceof FieldNodeData) {
      MappingService.mapToCondition(editorNodeData.mapping, fromNode.field);
    } else {
      MappingService.wrapWithFunction(editorNodeData.mapping, fromNode.functionDefinition);
    }
    onUpdate();
    return { success: true };
  }

  handleDragOver(_event: DragOverEvent): void {
    // no-op ATM
  }
  handleDragStart(_event: DragStartEvent): DnDResult {
    return { success: true };
  }
}
