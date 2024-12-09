import { DnDHandler } from './DnDHandler';
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { EditorNodeData, FieldNodeData, FunctionNodeData, MappingTree, NodeData } from '../../models/datamapper';
import { MappingService } from '../../services/mapping.service';

export class ExpressionEditorDnDHandler implements DnDHandler {
  handleDragEnd(event: DragEndEvent, _mappingTree: MappingTree, onUpdate: () => void): void {
    const fromNode = event.active.data.current as NodeData;
    const toNode = event.over?.data.current as NodeData;
    if (
      !fromNode ||
      !toNode ||
      (!(fromNode instanceof FunctionNodeData) && !(fromNode instanceof FieldNodeData)) ||
      !(toNode instanceof EditorNodeData)
    )
      return;
    const editorNodeData = toNode as EditorNodeData;
    if (fromNode instanceof FieldNodeData) {
      MappingService.mapToCondition(editorNodeData.mapping, fromNode.field);
    } else {
      MappingService.wrapWithFunction(editorNodeData.mapping, fromNode.functionDefinition);
    }
    onUpdate();
  }

  handleDragOver(_event: DragOverEvent): void {}
  handleDragStart(_event: DragStartEvent): void {}
}
