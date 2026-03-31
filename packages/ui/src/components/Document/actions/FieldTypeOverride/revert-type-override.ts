import { DocumentDefinition, IDocument, IField } from '../../../../models/datamapper/document';
import { FieldTypeOverrideService } from '../../../../services/field-type-override.service';

/**
 * Revert a field type override without opening the modal.
 * Used by context menus and dropdown actions for direct reset.
 */
export function revertTypeOverride(
  field: IField,
  namespaceMap: Record<string, string>,
  updateDocument: (document: IDocument, definition: DocumentDefinition, previousRefId: string) => void,
): void {
  const document = field.ownerDocument;
  const previousRefId = document.getReferenceId(namespaceMap);
  FieldTypeOverrideService.revertFieldTypeOverride(document, field, namespaceMap);
  updateDocument(document, document.definition, previousRefId);
}
