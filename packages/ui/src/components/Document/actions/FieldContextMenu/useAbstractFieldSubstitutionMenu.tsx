import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { IFieldSubstituteInfo } from '../../../../models/datamapper/types';
import { NodeData, TargetNodeData } from '../../../../models/datamapper/visualization';
import { DocumentUtilService } from '../../../../services/document/document-util.service';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { SchemaPathService } from '../../../../services/schema-path.service';
import { MappingActionService } from '../../../../services/visualization/mapping-action.service';
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
    onClick: () => {
      onSelect(qname);
    },
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
    if (!abstractWrapperField) return undefined;
    const selectedField = DocumentUtilService.getSelectedMember(abstractWrapperField);
    if (!selectedField) return undefined;
    return findCandidateQName(candidates, selectedField);
  }, [abstractWrapperField, candidates]);

  const isTargetSide = !nodeData.isSource;

  const applySubstitution = useCallback(
    (field: IField, qname: string) => {
      FieldOverrideService.applyFieldSubstitution(field, qname, mappingTree.namespaceMap);

      if (isTargetSide) {
        const selectedMember = DocumentUtilService.getSelectedMember(field);
        if (selectedMember) MappingActionService.applyTargetSelection(nodeData as TargetNodeData, selectedMember);
      }

      const doc = field.ownerDocument;
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [isTargetSide, mappingTree.namespaceMap, nodeData, updateDocument],
  );

  const applyClearSubstitution = useCallback(
    (field: IField) => {
      if (isTargetSide) MappingActionService.clearTargetSelection(nodeData as TargetNodeData, field);

      const doc = field.ownerDocument;
      const schemaPath = SchemaPathService.build(field, mappingTree.namespaceMap);
      DocumentUtilService.invalidateDescendants(doc, schemaPath);
      FieldOverrideService.revertFieldSubstitution(field, mappingTree.namespaceMap);
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

  const clearSubstitutionAction: MenuAction = {
    label: 'Clear substitution',
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
