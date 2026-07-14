import { IDocument, IField } from '../../models/datamapper/document';
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
}
