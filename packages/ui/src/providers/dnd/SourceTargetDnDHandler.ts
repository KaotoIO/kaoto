import { DnDHandler } from './DnDHandler';
import { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { MappingTree, MappingTreeItem } from '../../models/mapping';
import { MappingService } from '../../services/mapping.service';
import { TransformationService } from '../../services/transformation.service';

export class SourceTargetDnDHandler implements DnDHandler {
  handleDragEnd(event: DragEndEvent, mappingTree: MappingTree, onUpdate: () => void): void {
    const fromField = event.active.data.current as MappingTreeItem;
    const toField = event.over?.data.current as MappingTreeItem;
    const { existing, sourceField, targetField } = MappingService.validateNewFieldPairForMapping(
      mappingTree,
      fromField,
      toField,
    );
    if (existing && sourceField) {
      TransformationService.addField(existing.source, sourceField);
      onUpdate();
    } else if (sourceField && targetField) {
      const mapping = MappingService.createNewMapping(sourceField, targetField);
      mappingTree.push(mapping);
      onUpdate();
    }
  }

  handleDragStart(event: DragStartEvent): void {}
}
