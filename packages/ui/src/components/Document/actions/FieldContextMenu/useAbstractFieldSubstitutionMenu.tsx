import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { IFieldMenuAction, IMemberSelection } from '../../../../models/datamapper/field-action';
import { NodeData } from '../../../../models/datamapper/visualization';
import { WrapperSelectionService } from '../../../../services/document/wrapper-selection.service';
import { AbstractFieldService } from '../../../../services/visualization/abstract-field.service';
import { buildSelectSelfAction } from './menu-utils';
import { MenuContributor } from './types';
import { WrapperSelectionModal } from './WrapperSelectionModal';

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
  } = AbstractFieldService.resolveInfo(nodeData, mappingTree.namespaceMap);

  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);

  const candidates = AbstractFieldService.resolveSubstitutionCandidates(abstractWrapperField, mappingTree.namespaceMap);

  const selectedQName = AbstractFieldService.resolveSelectedQName(abstractWrapperField, candidates);

  const isTargetSide = !nodeData.isSource;

  const applySubstitution = (wrapperField: IField, qname: string) => {
    AbstractFieldService.applyAbstractSubstitution(
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
  };

  const applyClearSubstitution = (wrapperField: IField) => {
    AbstractFieldService.clearAbstractSubstitution(nodeData, wrapperField, mappingTree.namespaceMap, isTargetSide);
    const doc = wrapperField.ownerDocument;
    const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
    updateDocument(doc, doc.definition, previousRefId);
  };

  // Case A: select a substitute from this node's own wrapper candidate list
  const handleSelectSubstitution = (qname: string) => {
    if (!abstractWrapperField) return;
    applySubstitution(abstractWrapperField, qname);
  };

  // Case A/B: clear substitution on this node's wrapper (or the selected wrapper)
  const handleClearSubstitution = () => {
    if (!abstractWrapperField) return;
    applyClearSubstitution(abstractWrapperField);
  };

  const handleOpenSubstitutionModal = () => {
    setIsSubstitutionModalOpen(true);
  };

  // Case C: select this candidate within the parent abstract wrapper
  const handleSelectSelfAsCandidate = () => {
    if (!parentAbstractField || !candidateQName) return;
    applySubstitution(parentAbstractField, candidateQName);
  };

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

  const memberSelectedQName = AbstractFieldService.resolveMemberSelectedQName(
    isAbstractWrapperMember,
    field,
    abstractWrapperField,
    candidates,
  );

  const menuGroups = AbstractFieldService.buildMenuGroups({
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

  const closeSubstitutionModal = () => {
    setIsSubstitutionModalOpen(false);
  };

  const modalCandidates = abstractWrapperField
    ? AbstractFieldService.buildAbstractCandidates(abstractWrapperField, mappingTree.namespaceMap)
    : [];

  const handleModalSelect = (selection: IMemberSelection) => {
    if (selection.substituteQName) handleSelectSubstitution(selection.substituteQName);
  };

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
