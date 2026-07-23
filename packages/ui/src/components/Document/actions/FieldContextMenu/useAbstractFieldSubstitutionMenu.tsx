import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { IFieldMenuAction, IMemberSelection } from '../../../../models/datamapper/field-action';
import { NodeData } from '../../../../models/datamapper/visualization';
import { WrapperSelectionService } from '../../../../services/document/wrapper-selection.service';
import { WrapperActionService } from '../../../../services/visualization/wrapper-action.service';
import { WrapperSelectionModal } from '../WrapperSelectionModal';
import { buildSelectSelfAction } from './menu-utils';
import { MenuContributor } from './types';

export function useAbstractFieldSubstitutionMenu(nodeData: NodeData): MenuContributor {
  const { mappingTree, updateDocument } = useDataMapper();

  const {
    isAbstractWrapper,
    isAbstractWrapperMember,
    isSelectedSubstitution,
    isSubstitutionCandidate,
    abstractWrapperField,
    field,
    parentAbstractField,
    candidateQName,
  } = WrapperActionService.resolveAbstractFieldInfo(nodeData, mappingTree.namespaceMap);

  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);

  const candidates = useMemo(
    () => WrapperActionService.resolveSubstitutionCandidates(abstractWrapperField, mappingTree.namespaceMap),
    [abstractWrapperField, mappingTree.namespaceMap],
  );

  const selectedQName = useMemo(
    () => WrapperActionService.resolveSelectedQName(abstractWrapperField, candidates),
    [abstractWrapperField, candidates],
  );

  const isTargetSide = !nodeData.isSource;

  const applySubstitution = useCallback(
    (wrapperField: IField, qname: string) => {
      WrapperActionService.applyAbstractSubstitution(
        nodeData,
        wrapperField,
        qname,
        candidates,
        abstractWrapperField,
        mappingTree.namespaceMap,
        isTargetSide,
      );
      const doc = wrapperField.ownerDocument;
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [isTargetSide, candidates, abstractWrapperField, mappingTree.namespaceMap, nodeData, updateDocument],
  );

  const applyClearSubstitution = useCallback(
    (wrapperField: IField) => {
      WrapperActionService.clearAbstractSubstitution(nodeData, wrapperField, mappingTree.namespaceMap, isTargetSide);
      const doc = wrapperField.ownerDocument;
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [isTargetSide, mappingTree.namespaceMap, nodeData, updateDocument],
  );

  // Case A: select a substitute from this node's own wrapper candidate list
  const handleSelectSubstitution = useCallback(
    (qname: string) => {
      if (!abstractWrapperField) return;
      applySubstitution(abstractWrapperField, qname);
    },
    [abstractWrapperField, applySubstitution],
  );

  // Case A/B: clear substitution on this node's wrapper (or the selected wrapper)
  const handleClearSubstitution = useCallback(() => {
    if (!abstractWrapperField) return;
    applyClearSubstitution(abstractWrapperField);
  }, [abstractWrapperField, applyClearSubstitution]);

  const handleOpenSubstitutionModal = useCallback(() => {
    setIsSubstitutionModalOpen(true);
  }, []);

  // Case C: select this candidate within the parent abstract wrapper
  const handleSelectSelfAsCandidate = useCallback(() => {
    if (!parentAbstractField || !candidateQName) return;
    applySubstitution(parentAbstractField, candidateQName);
  }, [parentAbstractField, candidateQName, applySubstitution]);

  const clearSubstitutionAction: IFieldMenuAction = {
    label: 'Clear substitution',
    onClick: handleClearSubstitution,
    testId: 'clear-substitution',
  };

  const isInsideChoiceWrapper =
    abstractWrapperField !== undefined &&
    WrapperSelectionService.findParentWrapper(abstractWrapperField, 'choice') !== undefined;

  const selectSelfAction =
    isSubstitutionCandidate && !isSelectedSubstitution && !isInsideChoiceWrapper
      ? buildSelectSelfAction(field, parentAbstractField, handleSelectSelfAsCandidate, 'select-substitution-member')
      : undefined;

  const changeSubstituteAction: IFieldMenuAction = {
    label: 'Select Substitute...',
    onClick: handleOpenSubstitutionModal,
    testId: 'change-substitution',
  };

  const memberSelectedQName = useMemo(
    () =>
      WrapperActionService.resolveMemberSelectedQName(isAbstractWrapperMember, field, abstractWrapperField, candidates),
    [isAbstractWrapperMember, field, abstractWrapperField, candidates],
  );

  const menuGroups = WrapperActionService.buildMenuGroupsForAbstractNode({
    isAbstractWrapper,
    isAbstractWrapperMember,
    isInsideChoiceWrapper,
    isSelectedSubstitution,
    candidates,
    selectedQName,
    memberSelectedQName,
    selectSelfAction,
    clearSubstitutionAction,
    changeSubstituteAction,
    onSelectSubstitution: handleSelectSubstitution,
    onOpenSubstitutionModal: handleOpenSubstitutionModal,
    selectedIcon: <CheckIcon />,
    unselectedIcon: <Choices />,
  });

  const closeSubstitutionModal = useCallback(() => {
    setIsSubstitutionModalOpen(false);
  }, []);

  const modalCandidates = useMemo(
    () =>
      abstractWrapperField
        ? WrapperActionService.buildAbstractCandidates(abstractWrapperField, mappingTree.namespaceMap)
        : [],
    [abstractWrapperField, mappingTree.namespaceMap],
  );

  const handleModalSelect = useCallback(
    (selection: IMemberSelection) => {
      if (selection.substituteQName) handleSelectSubstitution(selection.substituteQName);
    },
    [handleSelectSubstitution],
  );

  const fieldName = abstractWrapperField?.displayName || abstractWrapperField?.name || 'Abstract';

  return {
    groups: menuGroups,
    modals:
      isSubstitutionModalOpen && abstractWrapperField ? (
        <WrapperSelectionModal
          isOpen={isSubstitutionModalOpen}
          title={`Select substitute for ${fieldName}`}
          description={`Choose a concrete element for ${fieldName}`}
          testId="substitution-selection-modal"
          candidates={modalCandidates}
          selectedKey={(isAbstractWrapperMember ? memberSelectedQName : selectedQName) ?? null}
          onSelect={handleModalSelect}
          onClose={closeSubstitutionModal}
        />
      ) : null,
  };
}
