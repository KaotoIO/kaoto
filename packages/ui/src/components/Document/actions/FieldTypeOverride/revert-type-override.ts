import { DocumentDefinition, IDocument, IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import { FieldTypeOverrideService } from '../../../../services/field-type-override.service';

/**
 * Revert a field override (type override or substitution) without opening the modal.
 * Dispatches to the correct service method based on the field's current override variant.
 * Used by context menus and dropdown actions for direct reset.
 */
export function revertOverride(
  field: IField,
  namespaceMap: Record<string, string>,
  updateDocument: (document: IDocument, definition: DocumentDefinition, previousRefId: string) => void,
): void {
  const hasAbstractSubstitution = field.wrapperKind === 'abstract' && field.selectedMemberIndex !== undefined;
  if (field.typeOverride === FieldOverrideVariant.NONE && !hasAbstractSubstitution) return;

  const document = field.ownerDocument;
  const previousRefId = document.getReferenceId(namespaceMap);

  if (hasAbstractSubstitution || field.typeOverride === FieldOverrideVariant.SUBSTITUTION) {
    FieldTypeOverrideService.revertFieldSubstitution(field, namespaceMap);
  } else {
    FieldTypeOverrideService.revertFieldTypeOverride(field, namespaceMap);
  }

  updateDocument(document, document.definition, previousRefId);
}
