import { Icon } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, ReactNode, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { DocumentDefinition, IDocument, IField } from '../../../models/datamapper/document';
import { IFieldTypeInfo, TypeOverrideVariant } from '../../../models/datamapper/types';
import { FieldTypeOverrideService } from '../../../services/field-type-override.service';
import { TypeOverrideModal } from './TypeOverrideModal';

type FieldTypeOverrideProps = {
  field: IField;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

/**
 * Dedicated component for field type override operations.
 * Wraps TypeOverrideModal with save/remove handlers, consolidating
 * the override logic that was previously duplicated across
 * SourceDocumentNode, TargetNodeActions, and ConditionMenuAction.
 */
export const FieldTypeOverride: FunctionComponent<FieldTypeOverrideProps> = ({
  field,
  isOpen,
  onClose,
  onComplete,
}) => {
  const { mappingTree, updateDocument } = useDataMapper();

  const handleSave = useCallback(
    (
      selectedType: IFieldTypeInfo,
      variant: TypeOverrideVariant.SAFE | TypeOverrideVariant.FORCE,
      supplementarySchemas?: Record<string, string>,
    ) => {
      const document = field.ownerDocument;
      const namespaceMap = mappingTree.namespaceMap;
      const previousRefId = document.getReferenceId(namespaceMap);

      let definition = document.definition;
      if (supplementarySchemas && Object.keys(supplementarySchemas).length > 0) {
        definition = FieldTypeOverrideService.addSchemaFilesForTypeOverride(document, supplementarySchemas);
      }

      FieldTypeOverrideService.applyFieldTypeOverride(document, field, selectedType, namespaceMap, variant);
      updateDocument(document, definition, previousRefId);
      onComplete();
      onClose();
    },
    [field, mappingTree.namespaceMap, updateDocument, onComplete, onClose],
  );

  const handleRemove = useCallback(() => {
    revertTypeOverride(field, mappingTree.namespaceMap, updateDocument);
    onComplete();
    onClose();
  }, [field, mappingTree.namespaceMap, updateDocument, onComplete, onClose]);

  return (
    <TypeOverrideModal isOpen={isOpen} field={field} onSave={handleSave} onRemove={handleRemove} onClose={onClose} />
  );
};

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

/** Render a wrench icon indicator for a field with a type override. Returns null if no override. */
export function renderTypeOverrideIndicator(field: IField | undefined): ReactNode {
  if (!field || field.typeOverride === TypeOverrideVariant.NONE) return null;
  return (
    <Icon
      className="node__spacer"
      size="sm"
      status="warning"
      isInline
      title={`Type overridden: ${field.originalType} → ${field.type}`}
    >
      <WrenchIcon />
    </Icon>
  );
}
