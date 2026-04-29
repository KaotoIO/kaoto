import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import {
  AbstractFieldNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
} from '../../../../models/datamapper/visualization';
import { VisualizationUtilService } from '../../../../services/visualization/visualization-util.service';
import { MenuGroup } from '../FieldContextMenu';
import { FieldOverride } from '../FieldOverride/FieldOverride';
import { revertOverride } from '../FieldOverride/revert-override';
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

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const handleResetOverride = useCallback(() => {
    const revertTarget = abstractWrapperField ?? field;
    if (revertTarget) {
      revertOverride(revertTarget, mappingTree.namespaceMap, updateDocument);
    }
  }, [abstractWrapperField, field, mappingTree.namespaceMap, updateDocument]);

  const groups = useMemo((): MenuGroup[] => {
    if (field?.wrapperKind === 'choice') return [];
    return [
      { actions: [{ label: 'Override Field...', onClick: handleOverrideType, testId: 'field-override' }] },
      hasFieldOverride
        ? { actions: [{ label: 'Reset Override', onClick: handleResetOverride, testId: 'field-reset-override' }] }
        : { actions: [] },
    ];
  }, [field?.wrapperKind, hasFieldOverride, handleOverrideType, handleResetOverride]);

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
