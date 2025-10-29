import { DnDHandler } from './DnDHandler';
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { MappingTree } from '../../models/datamapper/mapping';
import { NodeData } from '../../models/datamapper/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { DocumentType } from '../../models/datamapper/document';

export class SourceTargetDnDHandler implements DnDHandler {
  handleDragEnd(event: DragEndEvent, mappingTree: MappingTree, onUpdate: () => void): void {
    const fromNode = event.active.data.current as NodeData;
    const toNode = event.over?.data.current as NodeData;
    if (!fromNode || !toNode) return;
    if (
      fromNode.isSource &&
      fromNode.isPrimitive &&
      (fromNode as DocumentNodeData).document?.documentType === DocumentType.SOURCE_BODY
    ) {
      alert('Cannot map primitive source body without schema.');
      return;
    }

    const { sourceNode, targetNode } = VisualizationService.testNodePair(fromNode, toNode);
    if (sourceNode && targetNode) {
      VisualizationService.engageMapping(mappingTree, sourceNode, targetNode);
      onUpdate();
    }
  }

  handleDragOver(_event: DragOverEvent): void {}
  handleDragStart(_event: DragStartEvent): void {}
}
