import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { IFieldSubstituteInfo } from '../../../../models/datamapper/types';
import { NodeData } from '../../../../models/datamapper/visualization';
import { WrapperSelectionService } from '../../../../services/document/wrapper-selection.service';
import { MemberSelection, WrapperActionService } from '../../../../services/visualization/wrapper-action.service';
import { MenuAction, MenuGroup } from '../FieldContextMenu';
import { WrapperSelectionModal } from '../WrapperSelectionModal';
import { buildSelectSelfAction } from './menu-utils';
import { MenuContributor } from './types';

const INLINE_SUBSTITUTION_LIMIT = 10;

interface AbstractMenuGroupsConfig {
  isAbstractWrapper: boolean;
  isAbstractWrapperMember: boolean;
  isInsideChoiceWrapper: boolean;
  isSelectedSubstitution: boolean;
  candidates: Record<string, IFieldSubstituteInfo>;
  selectedQName: string | undefined;
  memberSelectedQName: string | undefined;
  selectSelfAction: MenuAction | undefined;
  clearSubstitutionAction: MenuAction;
  changeSubstituteAction: MenuAction;
  onSelectSubstitution: (qname: string) => void;
  onOpenSubstitutionModal: () => void;
}

function buildMenuGroupsForAbstractNode(config: AbstractMenuGroupsConfig): MenuGroup[] {
  if (config.isInsideChoiceWrapper && config.isAbstractWrapper) {
    const hasSelection = config.selectedQName !== undefined;
    return hasSelection ? [{ actions: [config.clearSubstitutionAction] }] : [];
  }
  if (config.isAbstractWrapper || config.isAbstractWrapperMember) {
    return buildAbstractWrapperMenuGroups(
      config.candidates,
      config.isAbstractWrapperMember ? config.memberSelectedQName : config.selectedQName,
      config.isAbstractWrapperMember ? undefined : config.selectSelfAction,
      config.clearSubstitutionAction,
      config.onSelectSubstitution,
      config.onOpenSubstitutionModal,
    );
  }
  const substitutionActions: MenuAction[] = [];
  if (config.isSelectedSubstitution)
    substitutionActions.push(config.clearSubstitutionAction, config.changeSubstituteAction);
  if (config.selectSelfAction) substitutionActions.push(config.selectSelfAction);
  return [{ actions: substitutionActions }];
}

function handleAbstractModalSelect(selection: MemberSelection, onSelectSubstitution: (qname: string) => void): void {
  if (selection.substituteQName) onSelectSubstitution(selection.substituteQName);
}

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

  const clearSubstitutionAction: MenuAction = {
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

  const changeSubstituteAction: MenuAction = {
    label: 'Select Substitute...',
    onClick: handleOpenSubstitutionModal,
    testId: 'change-substitution',
  };

  const memberSelectedQName = useMemo(
    () =>
      WrapperActionService.resolveMemberSelectedQName(isAbstractWrapperMember, field, abstractWrapperField, candidates),
    [isAbstractWrapperMember, field, abstractWrapperField, candidates],
  );

  const menuGroups = buildMenuGroupsForAbstractNode({
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
    (selection: MemberSelection) => {
      handleAbstractModalSelect(selection, handleSelectSubstitution);
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
