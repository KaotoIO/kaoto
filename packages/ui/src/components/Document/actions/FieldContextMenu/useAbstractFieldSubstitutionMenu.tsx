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
import { WrapperSelectionModal } from '../WrapperSelectionModal';
import {
  buildSelectSelfAction,
  findCandidateQName,
  resolveAbstractFieldInfo,
  resolveCandidateField,
} from './menu-utils';
import { MemberSelection, MenuContributor } from './types';

const INLINE_SUBSTITUTION_LIMIT = 10;

function applyPerInstanceAbstractSubstitution(
  nodeData: NodeData,
  wrapperField: IField,
  qname: string,
  candidates: Record<string, IFieldSubstituteInfo>,
  abstractWrapperField: IField | undefined,
  namespaceMap: { [prefix: string]: string },
): void {
  const candidateField = resolveCandidateField(wrapperField, qname, candidates, abstractWrapperField, namespaceMap);
  if (candidateField) {
    MappingActionService.applyTargetSelection(nodeData as TargetNodeData, candidateField);
  }
}

function applyDocumentLevelAbstractSubstitution(
  nodeData: NodeData,
  wrapperField: IField,
  qname: string,
  namespaceMap: { [prefix: string]: string },
  isTargetSide: boolean,
): void {
  FieldOverrideService.applyFieldSubstitution(wrapperField, qname, namespaceMap);
  if (!isTargetSide) return;
  const selectedMember = DocumentUtilService.getSelectedMember(wrapperField);
  if (selectedMember) MappingActionService.applyTargetSelection(nodeData as TargetNodeData, selectedMember);
}

function clearDocumentLevelAbstractSubstitution(
  nodeData: NodeData,
  wrapperField: IField,
  namespaceMap: { [prefix: string]: string },
  isTargetSide: boolean,
): void {
  if (isTargetSide) MappingActionService.clearTargetSelection(nodeData as TargetNodeData, wrapperField);
  const doc = wrapperField.ownerDocument;
  const schemaPath = SchemaPathService.build(wrapperField, namespaceMap);
  DocumentUtilService.invalidateDescendants(doc, schemaPath);
  FieldOverrideService.revertFieldSubstitution(wrapperField, namespaceMap);
}

function resolveSelectedQName(
  abstractWrapperField: IField | undefined,
  candidates: Record<string, IFieldSubstituteInfo>,
): string | undefined {
  if (!abstractWrapperField) return undefined;
  const selectedField = DocumentUtilService.getSelectedMember(abstractWrapperField);
  return selectedField ? findCandidateQName(candidates, selectedField) : undefined;
}

function applyAbstractSubstitution(
  nodeData: NodeData,
  wrapperField: IField,
  qname: string,
  candidates: Record<string, IFieldSubstituteInfo>,
  abstractWrapperField: IField | undefined,
  namespaceMap: { [prefix: string]: string },
  isTargetSide: boolean,
): void {
  if (isTargetSide && wrapperField.maxOccurs !== 1) {
    applyPerInstanceAbstractSubstitution(nodeData, wrapperField, qname, candidates, abstractWrapperField, namespaceMap);
    return;
  }
  applyDocumentLevelAbstractSubstitution(nodeData, wrapperField, qname, namespaceMap, isTargetSide);
}

function clearAbstractSubstitution(
  nodeData: NodeData,
  wrapperField: IField,
  namespaceMap: { [prefix: string]: string },
  isTargetSide: boolean,
): void {
  if (isTargetSide && wrapperField.maxOccurs !== 1) {
    MappingActionService.clearPerInstanceWrapperSelection(nodeData as TargetNodeData, wrapperField);
    return;
  }
  clearDocumentLevelAbstractSubstitution(nodeData, wrapperField, namespaceMap, isTargetSide);
}

function resolveSubstitutionCandidates(
  abstractWrapperField: IField | undefined,
  namespaceMap: { [prefix: string]: string },
): Record<string, IFieldSubstituteInfo> {
  if (!abstractWrapperField) return {};
  return FieldOverrideService.getFieldSubstitutionCandidates(abstractWrapperField, namespaceMap);
}

function resolveMemberSelectedQName(
  isAbstractWrapperMember: boolean,
  field: IField | undefined,
  abstractWrapperField: IField | undefined,
  candidates: Record<string, IFieldSubstituteInfo>,
): string | undefined {
  if (!isAbstractWrapperMember || !field || !abstractWrapperField) return undefined;
  return findCandidateQName(candidates, field);
}

interface AbstractMenuGroupsConfig {
  isAbstractWrapper: boolean;
  isAbstractWrapperMember: boolean;
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
  } = resolveAbstractFieldInfo(nodeData, mappingTree.namespaceMap);

  const [isSubstitutionModalOpen, setIsSubstitutionModalOpen] = useState(false);

  const candidates = useMemo(
    () => resolveSubstitutionCandidates(abstractWrapperField, mappingTree.namespaceMap),
    [abstractWrapperField, mappingTree.namespaceMap],
  );

  const selectedQName = useMemo(
    () => resolveSelectedQName(abstractWrapperField, candidates),
    [abstractWrapperField, candidates],
  );

  const isTargetSide = !nodeData.isSource;

  const applySubstitution = useCallback(
    (wrapperField: IField, qname: string) => {
      applyAbstractSubstitution(
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
      clearAbstractSubstitution(nodeData, wrapperField, mappingTree.namespaceMap, isTargetSide);
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

  const selectSelfAction =
    isSubstitutionCandidate && !isSelectedSubstitution
      ? buildSelectSelfAction(field, parentAbstractField, handleSelectSelfAsCandidate, 'select-substitution-member')
      : undefined;

  const changeSubstituteAction: MenuAction = {
    label: 'Select Substitute...',
    onClick: handleOpenSubstitutionModal,
    testId: 'change-substitution',
  };

  const memberSelectedQName = useMemo(
    () => resolveMemberSelectedQName(isAbstractWrapperMember, field, abstractWrapperField, candidates),
    [isAbstractWrapperMember, field, abstractWrapperField, candidates],
  );

  const menuGroups = buildMenuGroupsForAbstractNode({
    isAbstractWrapper,
    isAbstractWrapperMember,
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
      Object.entries(candidates).map(([qname, info]) => ({
        key: qname,
        label: info.displayName,
        typeBadge: info.type,
        selection: { memberIndex: 0, substituteQName: qname },
      })),
    [candidates],
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
