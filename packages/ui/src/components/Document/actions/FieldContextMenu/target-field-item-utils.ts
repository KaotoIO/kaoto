import { IField } from '../../../../models/datamapper/document';
import { FieldItem, MappingParentType } from '../../../../models/datamapper/mapping';
import {
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../../../models/datamapper/visualization';
import { MappingService } from '../../../../services/mapping/mapping.service';

/**
 * Walks up the target-side visualization tree to find (or lazily create) the
 * nearest {@link FieldItem} ancestor. Unselected wrapper nodes are skipped —
 * they have no mapping-tree counterpart.
 *
 * Replicates the logic of `MappingActionService.getOrCreateFieldItem` (which
 * is private) so the context-menu hooks can create FieldItems without reaching
 * into `MappingActionService` internals.
 */
export function getOrCreateParentFieldItem(nodeData: TargetNodeData): MappingParentType {
  if (nodeData.mapping) return nodeData.mapping;
  const fieldNodeData = nodeData as TargetFieldNodeData;
  if (fieldNodeData instanceof TargetChoiceFieldNodeData && !fieldNodeData.choiceField) {
    return getOrCreateParentFieldItem(fieldNodeData.parent);
  }
  if (fieldNodeData instanceof TargetAbstractFieldNodeData && !fieldNodeData.abstractField) {
    return getOrCreateParentFieldItem(fieldNodeData.parent);
  }
  const parentItem = getOrCreateParentFieldItem(fieldNodeData.parent);
  return MappingService.createFieldItem(parentItem, fieldNodeData.field);
}

/**
 * Creates a new {@link FieldItem} for a wrapper selection (substitute or
 * choice member) and marks it as user-created.
 *
 * Used by both abstract and choice context-menu hooks when the user selects
 * a substitute/member on a bare target-side wrapper node (no existing FieldItem).
 */
export function createSelectionFieldItem(nodeData: TargetNodeData, selectedField: IField): FieldItem {
  const parentItem = getOrCreateParentFieldItem((nodeData as TargetFieldNodeData).parent);
  const fieldItem = MappingService.createFieldItem(parentItem, selectedField);
  fieldItem.isUserCreated = true;
  return fieldItem;
}

/**
 * Replaces the field on an existing {@link FieldItem}, preserving
 * `isUserCreated` and re-parenting children.
 *
 * Used when switching a wrapper selection (e.g. wrapper→candidate on select,
 * candidate→wrapper on clear) while the FieldItem already exists — typically
 * inside an instruction node.
 */
export function replaceFieldItemField(existingItem: FieldItem, newField: IField): FieldItem {
  const updated = new FieldItem(existingItem.parent, newField);
  updated.isUserCreated = existingItem.isUserCreated;
  updated.children = existingItem.children.map((child) => {
    child.parent = updated;
    return child;
  });
  existingItem.parent.children = existingItem.parent.children.map((child) =>
    child === existingItem ? updated : child,
  );
  return updated;
}

/**
 * Removes all child {@link MappingItem}s from a {@link FieldItem}.
 *
 * Called when clearing a wrapper selection — the children under the old
 * candidate/member become orphans since the wrapper's children are hidden.
 */
export function removeChildFieldItems(fieldItem: FieldItem): void {
  fieldItem.children = [];
}

/**
 * Creates or replaces a target-side FieldItem to reference the selected
 * candidate/member field.
 *
 * If the node already has a FieldItem (e.g. inside an instruction), the
 * existing item's field is replaced. Otherwise a new FieldItem is created
 * with {@link FieldItem.isUserCreated} = true.
 */
export function applyTargetSelection(nodeData: TargetNodeData, selectedField: IField): void {
  const existingMapping = nodeData.mapping;
  if (existingMapping instanceof FieldItem) {
    replaceFieldItemField(existingMapping, selectedField);
  } else {
    createSelectionFieldItem(nodeData, selectedField);
  }
}

/**
 * Clears a target-side wrapper selection by replacing the FieldItem's field
 * back to the wrapper IField and removing all child FieldItems.
 *
 * No-op if the node has no existing FieldItem.
 */
export function clearTargetSelection(nodeData: TargetNodeData, wrapperField: IField): void {
  const existingMapping = nodeData.mapping;
  if (existingMapping instanceof FieldItem) {
    removeChildFieldItems(existingMapping);
    replaceFieldItemField(existingMapping, wrapperField);
  }
}
