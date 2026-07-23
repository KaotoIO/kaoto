import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IFieldMenuGroup } from '../../../../models/datamapper/field-action';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import {
  AbstractFieldNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
} from '../../../../models/datamapper/visualization';
import { VisualizationUtilService } from '../../../../services/visualization/visualization-util.service';
import { WrapperActionService } from '../../../../services/visualization/wrapper-action.service';
import { FieldOverride } from '../FieldOverride/FieldOverride';
import { MenuContributor } from './types';

export function useFieldOverrideMenu(nodeData: NodeData): MenuContributor {
  const { mappingTree, updateDocument } = useDataMapper();

  const field = VisualizationUtilService.getField(nodeData);
  const abstractWrapperField =
    nodeData instanceof AbstractFieldNodeData || nodeData instanceof TargetAbstractFieldNodeData
      ? nodeData.abstractField
      : undefined;
  const hasFieldOverride = !!field && (field.typeOverride !== FieldOverrideVariant.NONE || !!abstractWrapperField);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOverrideType = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleResetOverride = useCallback(() => {
    const revertTarget = abstractWrapperField ?? field;
    if (revertTarget) {
      const document = revertTarget.ownerDocument;
      const previousRefId = document.getReferenceId(mappingTree.namespaceMap);
      WrapperActionService.revertOverride(revertTarget, mappingTree.namespaceMap);
      updateDocument(document, document.definition, previousRefId);
    }
  }, [abstractWrapperField, field, mappingTree.namespaceMap, updateDocument]);

  const groups = useMemo((): IFieldMenuGroup[] => {
    if (field?.wrapperKind === 'choice' || field?.wrapperKind === 'sequence' || field?.wrapperKind === 'abstract')
      return [];
    if (abstractWrapperField) return [];
    return [
      { actions: [{ label: 'Override Field...', onClick: handleOverrideType, testId: 'field-override' }] },
      hasFieldOverride
        ? { actions: [{ label: 'Reset Override', onClick: handleResetOverride, testId: 'field-reset-override' }] }
        : { actions: [] },
    ];
  }, [abstractWrapperField, field?.wrapperKind, hasFieldOverride, handleOverrideType, handleResetOverride]);

  return {
    groups,
    modals:
      isModalOpen && field ? (
        <FieldOverride
          isOpen={isModalOpen}
          field={abstractWrapperField ?? field}
          onComplete={closeModal}
          onClose={closeModal}
        />
      ) : null,
  };
}
