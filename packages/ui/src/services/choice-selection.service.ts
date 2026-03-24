import { IDocument, IField } from '../models/datamapper/document';
import { IChoiceSelection } from '../models/datamapper/metadata';
import { DocumentUtilService } from './document-util.service';
import { SchemaPathService } from './schema-path.service';

/**
 * Service for choice selection operations.
 * Provides high-level orchestration for applying, setting, and managing choice selections.
 *
 * This service consolidates all choice selection functionality in one place, similar to
 * FieldTypeOverrideService for type overrides.
 *
 * @example
 * ```typescript
 * // Apply saved selections on document load
 * ChoiceSelectionService.applyChoiceSelections(document, savedSelections, namespaceMap);
 *
 * // Set a choice selection
 * ChoiceSelectionService.setChoiceSelection(document, choiceField, 1, namespaceMap);
 *
 * // Clear a choice selection
 * ChoiceSelectionService.clearChoiceSelection(document, choiceField, namespaceMap);
 * ```
 */
export class ChoiceSelectionService {
  /**
   * Apply saved choice selections to a document.
   *
   * This method is typically called during document initialization to restore
   * previously saved choice selections. It delegates to DocumentUtilService
   * to ensure consistency with other selection operations.
   *
   * Selections are sorted by path depth (ascending) to ensure parent choices are
   * applied before descendant choices. Invalid paths are skipped gracefully with
   * console warnings.
   *
   * @param document - The document to apply selections to
   * @param selections - Array of choice selections to apply
   * @param namespaceMap - Namespace prefix to URI mapping for path resolution
   *
   * @example
   * ```typescript
   * const selections = [
   *   { schemaPath: '/ns0:Root/{choice:0}', selectedMemberIndex: 1 },
   *   { schemaPath: '/ns0:Root/{choice:0}/ns0:Option1/{choice:0}', selectedMemberIndex: 0 }
   * ];
   * ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);
   * ```
   */
  static applyChoiceSelections(
    document: IDocument,
    selections: IChoiceSelection[],
    namespaceMap: Record<string, string>,
  ): void {
    // Sort by path depth (ascending) - parent choices before descendants
    const sortedSelections = [...selections].sort((a, b) => {
      const depthA = a.schemaPath.split('/').filter(Boolean).length;
      const depthB = b.schemaPath.split('/').filter(Boolean).length;
      return depthA - depthB;
    });

    // Apply each selection, warning on unresolvable paths
    for (const selection of sortedSelections) {
      const choiceField = SchemaPathService.navigateToChoiceField(document, selection.schemaPath, namespaceMap);
      if (!choiceField) {
        console.warn(`[ChoiceSelectionService] Could not resolve choice path: ${selection.schemaPath}`);
        continue;
      }

      if (selection.selectedMemberIndex < 0 || selection.selectedMemberIndex >= choiceField.fields.length) {
        console.warn(
          `[ChoiceSelectionService] Invalid member index ${selection.selectedMemberIndex} for choice at ${selection.schemaPath} (has ${choiceField.fields.length} members)`,
        );
        continue;
      }

      DocumentUtilService.processChoiceSelection(document, selection, namespaceMap);
    }
  }

  /**
   * Set a choice selection on a choice field.
   *
   * This method:
   * 1. Sets the selectedMemberIndex on the field
   * 2. Updates the document definition's choiceSelections array
   * 3. Cascade-invalidates all descendant choice selections
   *
   * The document is modified in place. After calling this method, use
   * `dataMapperProvider.updateDocument()` to persist changes and trigger re-visualization.
   *
   * @param document - The document containing the choice field
   * @param choiceField - The choice field to set selection on (must have isChoice === true)
   * @param selectedMemberIndex - 0-based index of the choice member to select
   * @param namespaceMap - Namespace prefix to URI mapping for path generation
   *
   * @example
   * ```typescript
   * ChoiceSelectionService.setChoiceSelection(document, choiceField, 1, namespaceMap);
   *
   * // Persist changes via provider
   * const previousRefId = document.getReferenceId(namespaceMap);
   * updateDocument(document, document.definition, previousRefId);
   * ```
   *
   * @see clearChoiceSelection
   */
  static setChoiceSelection(
    document: IDocument,
    choiceField: IField,
    selectedMemberIndex: number,
    namespaceMap: Record<string, string>,
  ): void {
    if (!choiceField.isChoice) {
      throw new TypeError('Field is not a choice compositor');
    }

    if (selectedMemberIndex < 0 || selectedMemberIndex >= choiceField.fields.length) {
      throw new RangeError(
        `Invalid member index ${selectedMemberIndex} for choice with ${choiceField.fields.length} members`,
      );
    }

    const schemaPath = SchemaPathService.build(choiceField, namespaceMap);
    const selection: IChoiceSelection = { schemaPath, selectedMemberIndex };

    // Apply to field and definition
    const changed = DocumentUtilService.processChoiceSelection(document, selection, namespaceMap);

    // Cascade invalidate descendants
    if (changed) {
      DocumentUtilService.invalidateDescendants(document, schemaPath);
    }
  }

  /**
   * Clear a choice selection from a choice field.
   *
   * This method:
   * 1. Clears the selectedMemberIndex from the field (sets to undefined)
   * 2. Removes the selection from the document definition's choiceSelections array
   * 3. Cascade-invalidates all descendant choice selections
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
   * @example
   * ```typescript
   * ChoiceSelectionService.clearChoiceSelection(document, choiceField, namespaceMap);
   *
   * // Persist changes via provider
   * const previousRefId = document.getReferenceId(namespaceMap);
   * updateDocument(document, document.definition, previousRefId);
   * ```
   *
   * @see setChoiceSelection
   */
  static clearChoiceSelection(document: IDocument, choiceField: IField, namespaceMap: Record<string, string>): void {
    if (!choiceField.isChoice) {
      throw new TypeError('Field is not a choice compositor');
    }

    if (choiceField.selectedMemberIndex === undefined) {
      return; // Already cleared
    }

    const schemaPath = SchemaPathService.build(choiceField, namespaceMap);

    // Remove from field and definition
    const changed = DocumentUtilService.removeChoiceSelection(document, schemaPath, namespaceMap);

    // Cascade invalidate descendants
    if (changed) {
      DocumentUtilService.invalidateDescendants(document, schemaPath);
    }
  }

  /**
   * Build a schema path string for a choice field.
   *
   * Constructs a path using {choice:N} segments for choice compositors and
   * element segments for regular fields. The index N is the position among
   * sibling choice fields (0-based).
   *
   * @param choiceField - The choice field to build the path for
   * @param namespaceMap - Namespace prefix to URI mapping for element segments
   * @returns Schema path string (e.g., '/ns0:Root/{choice:0}')
   *
   * @example
   * ```typescript
   * const path = ChoiceSelectionService.buildChoicePath(choiceField, namespaceMap);
   * // Returns: '/ns0:Root/{choice:0}'
   * ```
   *
   * @see resolveChoicePath
   */
  static buildChoicePath(choiceField: IField, namespaceMap: Record<string, string>): string {
    return SchemaPathService.build(choiceField, namespaceMap);
  }

  /**
   * Resolve a choice field by its schema path.
   *
   * Navigates the document tree following the path segments, matching {choice:N}
   * segments to choice fields by their position among sibling choices.
   *
   * @param document - The document to navigate in
   * @param choicePath - Schema path string identifying the choice field
   * @param namespaceMap - Namespace prefix to URI mapping for element segment resolution
   * @returns The choice field if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const field = ChoiceSelectionService.resolveChoicePath(
   *   document,
   *   '/ns0:Root/{choice:0}',
   *   namespaceMap
   * );
   * if (field) {
   *   console.log('Found choice with', field.fields.length, 'members');
   * }
   * ```
   *
   * @see buildChoicePath
   */
  static resolveChoicePath(
    document: IDocument,
    choicePath: string,
    namespaceMap: Record<string, string>,
  ): IField | undefined {
    return SchemaPathService.navigateToChoiceField(document, choicePath, namespaceMap);
  }
}
