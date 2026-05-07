import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { IFieldSubstituteInfo } from '../../../../models/datamapper/types';
import { NodeData } from '../../../../models/datamapper/visualization';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { MenuAction, MenuGroup } from '../FieldContextMenu';
import { SubstitutionSelectionModal } from '../SubstitutionSelectionModal';
import { buildSelectSelfAction, findCandidateQName, resolveAbstractFieldInfo } from './menu-utils';
import { MenuContributor } from './types';

const INLINE_SUBSTITUTION_LIMIT = 10;

function buildInlineSubstitutionActions(
  candidates: Record<string, IFieldSubstituteInfo>,
  selectedQName: string | undefined,
  onSelect: (qname: string) => void,
): MenuAction[] {
  return Object.entries(candidates).map(([qname, info]) => ({
    label: info.displayName,
    onClick: () => onSelect(qname),
    icon: selectedQName === qname ? <CheckIcon /> : <Choices />,
    testId: `substitution-menu-item-${qname}`,
  }));
}

function buildAbstractWrapperMenuGroups(
  candidates: Record<string, IFieldSubstituteInfo>,
  selectedQName: string | undefined,
  selectSelfAction: MenuAction | undefined,
  clearSubstitutionAction: MenuAction,
  handleSelectSubstitution: (qname: string) => void,
  handleOpenSubstitutionModal: () => void,
): MenuGroup[] {
  const candidateCount = Object.keys(candidates).length;

  if (candidateCount === 0 && selectedQName === undefined) {
    return selectSelfAction ? [{ actions: [selectSelfAction] }] : [];
  }

  const candidatesGroup: MenuGroup =
    candidateCount <= INLINE_SUBSTITUTION_LIMIT
      ? { actions: buildInlineSubstitutionActions(candidates, selectedQName, handleSelectSubstitution) }
      : {
          actions: [
            { label: 'Select Substitute...', onClick: handleOpenSubstitutionModal, testId: 'open-substitution-modal' },
          ],
        };

  const hasSelection = selectedQName !== undefined;
  return [
    { actions: selectSelfAction ? [selectSelfAction] : [] },
    candidatesGroup,
    { actions: hasSelection ? [clearSubstitutionAction] : [] },
  ];
}

export function useAbstractFieldSubstitutionMenu(nodeData: NodeData): MenuContributor {
  const { mappingTree, updateDocument } = useDataMapper();

  const {
    isAbstractWrapper,
    isSelectedSubstitution,
    isSubstitutionCandidate,
    abstractWrapperField,
    field,
    parentAbstractField,
    candidateQName,
  } = resolveAbstractFieldInfo(nodeData, mappingTree.namespaceMap);

  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);

  const candidates = useMemo(() => {
    if (!abstractWrapperField) return {};
    return FieldOverrideService.getFieldSubstitutionCandidates(abstractWrapperField, mappingTree.namespaceMap);
  }, [abstractWrapperField, mappingTree.namespaceMap]);

  const selectedQName = useMemo(() => {
    if (abstractWrapperField?.selectedMemberIndex === undefined) return undefined;
    const selectedField = abstractWrapperField.fields[abstractWrapperField.selectedMemberIndex];
    if (!selectedField) return undefined;
    return findCandidateQName(candidates, selectedField);
  }, [abstractWrapperField, candidates]);

  const applySubstitution = useCallback(
    (field: IField, qname: string) => {
      FieldOverrideService.applyFieldSubstitution(field, qname, mappingTree.namespaceMap);
      const doc = field.ownerDocument;
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [mappingTree.namespaceMap, updateDocument],
  );

  const applyClearSubstitution = useCallback(
    (field: IField) => {
      FieldOverrideService.revertFieldSubstitution(field, mappingTree.namespaceMap);
      const doc = field.ownerDocument;
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [mappingTree.namespaceMap, updateDocument],
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

  const clearSubstitutionAction: MenuAction = {
    label: 'Show All Substitution Options',
    onClick: handleClearSubstitution,
    testId: 'clear-substitution',
  };

  const selectSelfAction = isSubstitutionCandidate
    ? buildSelectSelfAction(field, parentAbstractField, handleSelectSelfAsCandidate, 'select-substitution-member')
    : undefined;

  let menuGroups: MenuGroup[];
  if (isAbstractWrapper) {
    menuGroups = buildAbstractWrapperMenuGroups(
      candidates,
      selectedQName,
      selectSelfAction,
      clearSubstitutionAction,
      handleSelectSubstitution,
      handleOpenSubstitutionModal,
    );
  } else {
    const substitutionActions: MenuAction[] = [];
    if (isSelectedSubstitution) substitutionActions.push(clearSubstitutionAction);
    if (selectSelfAction) substitutionActions.push(selectSelfAction);
    menuGroups = [{ actions: substitutionActions }];
  }

  const closeSubstitutionModal = useCallback(() => {
    setIsSubstitutionModalOpen(false);
  }, []);

  return {
    groups: menuGroups,
    modals:
      isSubstitutionModalOpen && abstractWrapperField ? (
        <SubstitutionSelectionModal
          isOpen={isSubstitutionModalOpen}
          abstractField={abstractWrapperField}
          candidates={candidates}
          onSelect={handleSelectSubstitution}
          onClose={closeSubstitutionModal}
        />
      ) : null,
  };
}
