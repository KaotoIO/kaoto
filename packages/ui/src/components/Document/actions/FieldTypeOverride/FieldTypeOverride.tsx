import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant, IFieldTypeInfo } from '../../../../models/datamapper/types';
import { FieldTypeOverrideService } from '../../../../services/field-type-override.service';
import { revertTypeOverride } from './revert-type-override';
import { TypeOverrideModal } from './TypeOverrideModal';

export { revertTypeOverride } from './revert-type-override';
export { TypeOverrideIndicator } from './TypeOverrideIndicator';

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
    (selectedType: IFieldTypeInfo | null) => {
      const document = field.ownerDocument;
      const namespaceMap = mappingTree.namespaceMap;
      const previousRefId = document.getReferenceId(namespaceMap);

      if (selectedType) {
        FieldTypeOverrideService.applyFieldTypeOverride(field, selectedType, namespaceMap, FieldOverrideVariant.SAFE);
      }
      updateDocument(document, document.definition, previousRefId);
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
