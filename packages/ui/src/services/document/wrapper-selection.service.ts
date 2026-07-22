import { IDocument, IField, WrapperKind } from '../../models/datamapper/document';
import { IChoiceSelection } from '../../models/datamapper/metadata';
import { SchemaPathService } from '../schema-path.service';
import { DocumentUtilService } from './document-util.service';
import { FieldOverrideService } from './field-override.service';

/**
 * Service for wrapper selection operations (choice and abstract).
 * Provides high-level orchestration for setting and managing wrapper selections.
 *
 * This service consolidates wrapper selection functionality, similar to
 * FieldOverrideService for type overrides.
 *
 * Note: Batch application of saved selections is handled by DocumentUtilService.processOverrides()
 * which applies choice selections together with field type overrides and substitutions in the
 * correct depth-sorted order to handle mutual interference between these override types.
 *
 * @example
 * ```typescript
 * // Set a choice selection
 * WrapperSelectionService.setChoiceSelection(document, choiceField, 1, namespaceMap);
 *
 * // Clear a choice selection
 * WrapperSelectionService.clearChoiceSelection(document, choiceField, namespaceMap);
 * ```
 */
export class WrapperSelectionService {
  /**
   * Set a choice selection on a choice field.
   *
   * This method:
   * 1. Sets the selectedMemberIndex on the field
   * 2. Updates the document definition's choiceSelections array
   *
   * Unlike field type overrides and substitutions which mutate document structure,
   * choice selection only chooses a path from existing options. Descendant overrides
   * (choice selections, type overrides, substitutions) are intentionally preserved
   * to avoid state inconsistency between the definition and the live field tree.
   *
   * The document is modified in place. After calling this method, use
   * `dataMapperProvider.updateDocument()` to persist changes and trigger re-visualization.
   *
   * @param document - The document containing the choice field
   * @param choiceField - The choice field to set selection on (must have wrapperKind === 'choice')
   * @param selectedMemberIndex - 0-based index of the choice member to select
   * @param namespaceMap - Namespace prefix to URI mapping for path generation
   *
   * @see clearChoiceSelection
   */
  static setChoiceSelection(
    document: IDocument,
    choiceField: IField,
    selectedMemberIndex: number,
    namespaceMap: Record<string, string>,
  ): void {
    if (choiceField.wrapperKind !== 'choice') {
      throw new TypeError('Field is not a choice compositor');
    }

    if (selectedMemberIndex < 0 || selectedMemberIndex >= choiceField.fields.length) {
      throw new RangeError(
        `Invalid member index ${selectedMemberIndex} for choice with ${choiceField.fields.length} members`,
      );
    }

    const schemaPath = SchemaPathService.build(choiceField, namespaceMap);
    const selection: IChoiceSelection = { schemaPath, selectedMemberIndex };

    DocumentUtilService.processChoiceSelection(document, selection, namespaceMap);
  }

  /**
   * Clear a choice selection from a choice field.
   *
   * This method:
   * 1. Clears the selectedMemberIndex from the field (sets to undefined)
   * 2. Removes the selection from the document definition's choiceSelections array
   *
   * Descendant overrides are intentionally preserved — see {@link setChoiceSelection}.
   *
   * This is a no-op if the field's selectedMemberIndex is already undefined.
   *
   * The document is modified in place. After calling this method, use
   * `dataMapperProvider.updateDocument()` to persist changes and trigger re-visualization.
   *
   * @param document - The document containing the choice field
   * @param choiceField - The choice field to clear selection from
   * @param namespaceMap - Namespace prefix to URI mapping for path generation
   *
   * @see setChoiceSelection
   */
  static clearChoiceSelection(document: IDocument, choiceField: IField, namespaceMap: Record<string, string>): void {
    if (choiceField.wrapperKind !== 'choice') {
      throw new TypeError('Field is not a choice compositor');
    }

    if (choiceField.selectedMemberIndex === undefined) {
      return; // Already cleared
    }

    const schemaPath = SchemaPathService.build(choiceField, namespaceMap);

    DocumentUtilService.removeChoiceSelection(document, schemaPath, namespaceMap);
  }

  /**
   * Recursively clears nested wrapper selections (both choice and abstract) beneath
   * the given field's currently selected member. Walks the member chain depth-first:
   * clears `selectedMemberIndex` for choice wrappers, reverts `selectedMemberQName`
   * for abstract wrappers.
   *
   * This operates on the live field tree only — it does not update the document
   * definition. Callers should follow up with {@link DocumentUtilService.invalidateDescendants}
   * to clean up persisted overrides, and then persist via `updateDocument()`.
   */
  static clearDescendantWrapperSelections(field: IField, namespaceMap: Record<string, string>): void {
    const member = DocumentUtilService.getSelectedMember(field);
    if (!member) return;
    if (member.wrapperKind === 'choice' && member.selectedMemberIndex !== undefined) {
      WrapperSelectionService.clearDescendantWrapperSelections(member, namespaceMap);
      member.selectedMemberIndex = undefined;
    }
    if (member.wrapperKind === 'abstract' && member.selectedMemberQName) {
      FieldOverrideService.revertFieldSubstitution(member, namespaceMap);
    }
  }

  /**
   * Walks up from `wrapper` through ancestor choice fields that also have a selection,
   * returning the outermost selected wrapper and the number of levels traversed.
   */
  static resolveOutermostSelectedWrapper(wrapper: IField | undefined): {
    outermost: IField | undefined;
    depth: number;
  } {
    let depth = 1;
    let current = wrapper;
    while (
      current?.parent &&
      'wrapperKind' in current.parent &&
      current.parent.wrapperKind === 'choice' &&
      current.parent.selectedMemberIndex !== undefined &&
      DocumentUtilService.getSelectedMember(current.parent) === current
    ) {
      depth++;
      current = current.parent;
    }
    return { outermost: current, depth };
  }

  /**
   * Determines whether a nested wrapper field should be flattened (recursed through)
   * during node data generation.
   *
   * Cross-kind nesting (e.g. choice>abstract) always flattens so the inner wrapper can
   * present its own UI (e.g. AbstractFieldNodeData for substitution selection).
   * Same-kind nesting (e.g. choice>choice) only flattens when the inner wrapper already
   * has a selection — otherwise the inner wrapper is shown as an unselected wrapper node.
   *
   * @param outerKind - The wrapper kind of the outer wrapper being processed
   * @param innerField - The selected member that is itself a wrapper field
   */
  static shouldFlattenNestedWrapper(outerKind: WrapperKind, innerField: IField): boolean {
    if (innerField.wrapperKind !== outerKind) return true;
    return DocumentUtilService.getSelectedMember(innerField) !== undefined;
  }

  /**
   * Finds the active parent wrapper of a given wrapper field.
   *
   * Returns the parent only when its current selection points at the given field — a choice
   * can have multiple wrapper children (e.g. several abstract members), but only the selected
   * one is the active nesting context. Returns undefined for top-level wrappers or when the
   * parent's selection targets a different member.
   *
   * @param wrapperField - The inner wrapper field to check
   * @param parentKind - The wrapper kind to look for in the parent
   */
  static findParentWrapper(wrapperField: IField, parentKind: WrapperKind): IField | undefined {
    const parent = wrapperField.parent;
    if (!parent || !('wrapperKind' in parent) || parent.wrapperKind !== parentKind) return undefined;
    const selectedMember = DocumentUtilService.getSelectedMember(parent);
    if (selectedMember !== wrapperField) return undefined;
    return parent;
  }
}
