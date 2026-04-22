import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

import { MappingTree } from '../../models/datamapper/mapping';
import { NodeData } from '../../models/datamapper/visualization';
import { MappingActionService } from '../../services/visualization/mapping-action.service';
import { MappingValidationService } from '../../services/visualization/mapping-validation.service';
import { DnDHandler, DnDResult } from './DnDHandler';

export class SourceTargetDnDHandler implements DnDHandler {
  handleDragEnd(event: DragEndEvent, mappingTree: MappingTree, onUpdate: () => void): DnDResult {
    const fromNode = event.active.data.current as NodeData;
    const toNode = event.over?.data.current as NodeData;
    if (!fromNode || !toNode) return { success: false };

    const validation = MappingValidationService.validateMappingPair(fromNode, toNode);
    if (!validation.isValid) {
      return { success: false, errorMessage: validation.errorMessage };
    }

    if (!validation.sourceNode || !validation.targetNode) return { success: false };
    MappingActionService.engageMapping(mappingTree, validation.sourceNode, validation.targetNode);
    onUpdate();
    return { success: true };
  }

  handleDragOver(_event: DragOverEvent): void {}

  handleDragStart(event: DragStartEvent): DnDResult {
    const node = event.active.data.current as NodeData;
    if (!node) return { success: false };
    return { success: MappingValidationService.isDraggable(node) };
  }
}
