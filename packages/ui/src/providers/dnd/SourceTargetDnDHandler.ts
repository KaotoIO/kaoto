import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';

import { MappingTree } from '../../models/datamapper/mapping';
import { NodeData } from '../../models/datamapper/visualization';
import { MappingValidationService } from '../../services/mapping-validation.service';
import { VisualizationService } from '../../services/visualization.service';
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
    VisualizationService.engageMapping(mappingTree, validation.sourceNode, validation.targetNode);
    onUpdate();
    return { success: true };
  }

  handleDragOver(_event: DragOverEvent): void {}
  handleDragStart(_event: DragStartEvent): void {}
}
