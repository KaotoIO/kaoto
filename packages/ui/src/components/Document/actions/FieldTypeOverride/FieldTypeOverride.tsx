import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import { FieldTypeOverrideService } from '../../../../services/field-type-override.service';
import { revertOverride } from './revert-type-override';
import { OverrideSavePayload, TypeOverrideModal } from './TypeOverrideModal';

export { revertOverride } from './revert-type-override';
export { TypeOverrideIndicator } from './TypeOverrideIndicator';

type FieldTypeOverrideProps = {
  field: IField;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

/**
 * Dedicated component for field override operations (type override and element substitution).
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

  const handleAttach = useCallback(
    (schemas: Record<string, string>) => {
      const document = field.ownerDocument;
      const namespaceMap = mappingTree.namespaceMap;
      const previousRefId = document.getReferenceId(namespaceMap);
      FieldTypeOverrideService.addSchemaFilesForTypeOverride(document, schemas);
      updateDocument(document, document.definition, previousRefId);
    },
    [field, mappingTree.namespaceMap, updateDocument],
  );

  const handleSave = useCallback(
    (payload: OverrideSavePayload) => {
      const document = field.ownerDocument;
      const namespaceMap = mappingTree.namespaceMap;
      const previousRefId = document.getReferenceId(namespaceMap);

      if (payload.mode === 'substitution') {
        FieldTypeOverrideService.applyFieldSubstitution(field, payload.selectedKey, namespaceMap);
      } else {
        FieldTypeOverrideService.applyFieldTypeOverride(
          field,
          payload.selectedType,
          namespaceMap,
          FieldOverrideVariant.SAFE,
        );
      }

      updateDocument(document, document.definition, previousRefId);
      onComplete();
      onClose();
    },
    [field, mappingTree.namespaceMap, updateDocument, onComplete, onClose],
  );

  const handleRemove = useCallback(() => {
    revertOverride(field, mappingTree.namespaceMap, updateDocument);
    onComplete();
    onClose();
  }, [field, mappingTree.namespaceMap, updateDocument, onComplete, onClose]);

  if (!isOpen) return null;

  return (
    <TypeOverrideModal
      field={field}
      onSave={handleSave}
      onAttach={handleAttach}
      onRemove={handleRemove}
      onClose={onClose}
    />
  );
};
