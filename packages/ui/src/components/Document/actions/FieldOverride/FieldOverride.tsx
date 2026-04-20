import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import { FieldOverrideService } from '../../../../services/field-override.service';
import { FieldOverrideModal, OverrideSavePayload } from './FieldOverrideModal';
import { revertOverride } from './revert-override';

export { OverrideIndicator } from './OverrideIndicator';
export { revertOverride } from './revert-override';

type FieldOverrideProps = {
  field: IField;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
};

/**
 * Dedicated component for field override operations (type override and element substitution).
 * Wraps FieldOverrideModal with save/remove handlers, consolidating
 * the override logic that was previously duplicated across
 * SourceDocumentNode, TargetNodeActions, and ConditionMenuAction.
 */
export const FieldOverride: FunctionComponent<FieldOverrideProps> = ({ field, isOpen, onClose, onComplete }) => {
  const { mappingTree, updateDocument } = useDataMapper();

  const handleAttach = useCallback(
    (schemas: Record<string, string>) => {
      const document = field.ownerDocument;
      const namespaceMap = mappingTree.namespaceMap;
      const previousRefId = document.getReferenceId(namespaceMap);
      FieldOverrideService.addSchemaFilesForTypeOverride(document, schemas);
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
        FieldOverrideService.applyFieldSubstitution(field, payload.selectedKey, namespaceMap);
      } else {
        FieldOverrideService.applyFieldTypeOverride(
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
    <FieldOverrideModal
      field={field}
      onSave={handleSave}
      onAttach={handleAttach}
      onRemove={handleRemove}
      onClose={onClose}
    />
  );
};
