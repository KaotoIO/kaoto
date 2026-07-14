import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { FieldItemNodeData, NodeData, TargetNodeData } from '../../../../models/datamapper/visualization';
import { DocumentUtilService } from '../../../../services/document/document-util.service';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { WrapperSelectionService } from '../../../../services/document/wrapper-selection.service';
import { SchemaPathService } from '../../../../services/schema-path.service';
import { MappingActionService } from '../../../../services/visualization/mapping-action.service';
import { VisualizationService } from '../../../../services/visualization/visualization.service';
import { VisualizationUtilService } from '../../../../services/visualization/visualization-util.service';
import { MenuAction, MenuGroup } from '../FieldContextMenu';
import { WrapperSelectionModal } from '../WrapperSelectionModal';
import { buildSelectSelfAction, dissolveChoiceMembers, findCandidateQName, resolveCandidateField } from './menu-utils';
import { MemberSelection, MenuContributor, WrapperCandidate } from './types';

const INLINE_CHOICE_LIMIT = 10;

function getFieldDisplayName(field: IField): string {
  return field.wrapperKind === 'choice'
    ? VisualizationService.getChoiceMemberLabel(field)
    : field.displayName || field.name;
}

function buildInlineMemberActions(
  dissolvedMembers: WrapperCandidate[],
  selectedKey: string | null,
  onSelect: (selection: MemberSelection) => void,
): MenuAction[] {
  return dissolvedMembers.map(({ key, label, selection }) => ({
    label,
    onClick: () => {
      onSelect(selection);
    },
    icon: selectedKey === key ? <CheckIcon /> : <Choices />,
    testId: selection.substituteQName
      ? 'choice-menu-item-' + selection.memberIndex + '-' + selection.substituteQName
      : 'choice-menu-item-' + selection.memberIndex,
  }));
}

function applyPerInstanceChoiceSelection(
  nodeData: NodeData,
  wrapper: IField,
  selection: MemberSelection,
  namespaceMap: { [prefix: string]: string },
): void {
  let candidateField: IField | undefined = wrapper.fields[selection.memberIndex];
  if (selection.substituteQName && candidateField) {
    candidateField = resolveCandidateField(candidateField, selection.substituteQName, {}, undefined, namespaceMap);
  }
  if (candidateField) {
    MappingActionService.applyTargetSelection(nodeData as TargetNodeData, candidateField);
  }
}

function applyDocumentLevelChoiceSelection(
  nodeData: NodeData,
  wrapper: IField,
  selection: MemberSelection,
  namespaceMap: { [prefix: string]: string },
  isTargetSide: boolean,
): void {
  const doc = wrapper.ownerDocument;
  WrapperSelectionService.setChoiceSelection(doc, wrapper, selection.memberIndex, namespaceMap);

  if (selection.substituteQName) {
    const abstractMember = wrapper.fields[selection.memberIndex];
    if (abstractMember) {
      FieldOverrideService.applyFieldSubstitution(abstractMember, selection.substituteQName, namespaceMap);
    }
  }

  if (isTargetSide) {
    const selectedMember = DocumentUtilService.getSelectedMember(wrapper);
    if (selectedMember) {
      const candidateField = selection.substituteQName
        ? (DocumentUtilService.getSelectedMember(selectedMember) ?? selectedMember)
        : selectedMember;
      MappingActionService.applyTargetSelection(nodeData as TargetNodeData, candidateField);
    }
  }
}

function clearDocumentLevelChoiceSelection(
  nodeData: NodeData,
  wrapper: IField,
  namespaceMap: { [prefix: string]: string },
  isTargetSide: boolean,
  clearDescendantSelections: (field: IField) => void,
): void {
  if (isTargetSide) MappingActionService.clearTargetSelection(nodeData as TargetNodeData, wrapper);
  clearDescendantSelections(wrapper);
  const doc = wrapper.ownerDocument;
  const schemaPath = SchemaPathService.build(wrapper, namespaceMap);
  DocumentUtilService.invalidateDescendants(doc, schemaPath);
  WrapperSelectionService.clearChoiceSelection(doc, wrapper, namespaceMap);
}

function clearChoiceSelectionOnField(
  nodeData: NodeData,
  wrapper: IField,
  namespaceMap: { [prefix: string]: string },
  isTargetSide: boolean,
  clearDescendantSelections: (field: IField) => void,
): void {
  if (isTargetSide && wrapper.maxOccurs !== 1) {
    MappingActionService.clearPerInstanceWrapperSelection(nodeData as TargetNodeData, wrapper);
    return;
  }
  clearDocumentLevelChoiceSelection(nodeData, wrapper, namespaceMap, isTargetSide, clearDescendantSelections);
}

function resolveMemberSelectedKey(
  nodeData: NodeData,
  choiceWrapperMemberField: IField | undefined,
  dissolved: WrapperCandidate[],
  namespaceMap: Record<string, string>,
): string | null {
  if (!(nodeData instanceof FieldItemNodeData)) return null;
  const memberField = nodeData.field;
  const wrapper = choiceWrapperMemberField;
  if (!wrapper) return null;
  const idx = wrapper.fields.indexOf(memberField);
  if (idx < 0) {
    const memberParent = memberField.parent && 'wrapperKind' in memberField.parent ? memberField.parent : undefined;
    if (memberParent) {
      const parentIdx = wrapper.fields.indexOf(memberParent as IField);
      const candidates = FieldOverrideService.getFieldSubstitutionCandidates(memberParent as IField, namespaceMap);
      const substituteQName = findCandidateQName(candidates, memberField);
      return (
        dissolved.find((d) => d.selection.memberIndex === parentIdx && d.selection.substituteQName === substituteQName)
          ?.key ?? null
      );
    }
    return null;
  }
  return dissolved.find((d) => d.selection.memberIndex === idx && !d.selection.substituteQName)?.key ?? null;
}

function dispatchChoiceSelection(
  nodeData: NodeData,
  wrapper: IField,
  selection: MemberSelection,
  namespaceMap: { [prefix: string]: string },
  isTargetSide: boolean,
): void {
  if (isTargetSide && wrapper.maxOccurs !== 1) {
    applyPerInstanceChoiceSelection(nodeData, wrapper, selection, namespaceMap);
    return;
  }
  applyDocumentLevelChoiceSelection(nodeData, wrapper, selection, namespaceMap, isTargetSide);
}

function resolveChoiceWrapper(
  isChoiceWrapperMember: boolean,
  choiceWrapperMemberField: IField | undefined,
  fallback: IField | undefined,
): IField | undefined {
  return isChoiceWrapperMember ? choiceWrapperMemberField : fallback;
}

function resolveSelectedModalKey(
  isChoiceWrapperMember: boolean,
  memberSelectedKey: string | null,
  activeChoiceWrapperForMembers: IField | undefined,
  dissolved: WrapperCandidate[],
): string | null {
  if (isChoiceWrapperMember) return memberSelectedKey;
  const idx = activeChoiceWrapperForMembers?.selectedMemberIndex;
  if (idx === undefined) return null;
  const member = activeChoiceWrapperForMembers?.fields[idx];
  const substituteQName = member?.selectedMemberQName?.toString();
  return (
    dissolved.find((d) => d.selection.memberIndex === idx && d.selection.substituteQName === substituteQName)?.key ??
    null
  );
}

interface ChoiceMenuGroupsConfig {
  isChoiceWrapper: boolean;
  isChoiceWrapperMember: boolean;
  isNestedSelectedChoice: boolean;
  isSelectedChoice: boolean;
  dissolved: WrapperCandidate[];
  selectedModalKey: string | null;
  selectSelfAction: MenuAction | undefined;
  clearChoiceAction: MenuAction;
  changeMemberAction: MenuAction;
  onSelectChoiceMember: (selection: MemberSelection) => void;
  onOpenChoiceModal: () => void;
}

function buildMenuGroupsForChoiceNode(config: ChoiceMenuGroupsConfig): MenuGroup[] {
  if (config.isChoiceWrapper || config.isChoiceWrapperMember) {
    const groups = buildChoiceWrapperMenuGroups(
      config.dissolved,
      config.selectedModalKey,
      config.isChoiceWrapperMember ? undefined : config.selectSelfAction,
      config.clearChoiceAction,
      config.onSelectChoiceMember,
      config.onOpenChoiceModal,
    );
    if (config.isNestedSelectedChoice) groups.push({ actions: [config.clearChoiceAction, config.changeMemberAction] });
    return groups;
  }
  const choiceActions: MenuAction[] = [];
  if (config.isSelectedChoice) choiceActions.push(config.clearChoiceAction, config.changeMemberAction);
  if (config.selectSelfAction) choiceActions.push(config.selectSelfAction);
  return [{ actions: choiceActions }];
}

function buildChoiceWrapperMenuGroups(
  dissolved: WrapperCandidate[],
  selectedKey: string | null,
  selectSelfAction: MenuAction | undefined,
  clearChoiceAction: MenuAction,
  handleSelectChoiceMember: (selection: MemberSelection) => void,
  handleOpenChoiceModal: () => void,
): MenuGroup[] {
  if (dissolved.length === 0 && selectedKey === null) {
    return selectSelfAction ? [{ actions: [selectSelfAction] }] : [];
  }

  const membersGroup: MenuGroup =
    dissolved.length <= INLINE_CHOICE_LIMIT
      ? { actions: buildInlineMemberActions(dissolved, selectedKey, handleSelectChoiceMember) }
      : { actions: [{ label: 'Select Member...', onClick: handleOpenChoiceModal, testId: 'open-choice-modal' }] };

  const hasSelection = selectedKey !== null;
  return [
    { actions: selectSelfAction ? [selectSelfAction] : [] },
    membersGroup,
    { actions: hasSelection ? [clearChoiceAction] : [] },
  ];
}

export function useChoiceContextMenu(nodeData: NodeData): MenuContributor {
  const { mappingTree, updateDocument } = useDataMapper();

  const {
    isChoiceWrapper,
    isSelectedChoice,
    isChoiceMember,
    isChoiceWrapperMember,
    activeChoiceWrapperForMembers,
    effectiveChoiceWrapper,
    choiceWrapperMemberField,
    choiceMemberField,
    parentChoiceWrapperField,
    choiceMemberIndex,
  } = VisualizationUtilService.resolveChoiceNodeInfo(nodeData);

  const isNestedSelectedChoice = isSelectedChoice && isChoiceWrapper;
  const isTargetSide = !nodeData.isSource;

  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  const dissolved = useMemo(() => {
    const members = effectiveChoiceWrapper?.fields ?? [];
    return dissolveChoiceMembers(members, mappingTree.namespaceMap);
  }, [effectiveChoiceWrapper?.fields, mappingTree.namespaceMap]);

  const applyChoiceSelection = useCallback(
    (wrapper: IField, selection: MemberSelection) => {
      dispatchChoiceSelection(nodeData, wrapper, selection, mappingTree.namespaceMap, isTargetSide);
      const doc = wrapper.ownerDocument;
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [isTargetSide, mappingTree.namespaceMap, nodeData, updateDocument],
  );

  const clearDescendantSelections = useCallback(
    (field: IField) => {
      WrapperSelectionService.clearDescendantWrapperSelections(field, mappingTree.namespaceMap);
    },
    [mappingTree.namespaceMap],
  );

  const applyClearChoice = useCallback(
    (wrapper: IField) => {
      clearChoiceSelectionOnField(nodeData, wrapper, mappingTree.namespaceMap, isTargetSide, clearDescendantSelections);
      const doc = wrapper.ownerDocument;
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [clearDescendantSelections, isTargetSide, mappingTree.namespaceMap, nodeData, updateDocument],
  );

  // Case A: select a member from this node's own wrapper member list
  const handleSelectChoiceMember = useCallback(
    (selection: MemberSelection) => {
      const wrapper = resolveChoiceWrapper(
        isChoiceWrapperMember,
        choiceWrapperMemberField,
        activeChoiceWrapperForMembers,
      );
      if (!wrapper) return;
      applyChoiceSelection(wrapper, selection);
    },
    [isChoiceWrapperMember, choiceWrapperMemberField, activeChoiceWrapperForMembers, applyChoiceSelection],
  );

  // Case A/B: clear selection on this node's active wrapper, cascading to parent when empty
  const handleClearChoice = useCallback(() => {
    const wrapper = resolveChoiceWrapper(
      isChoiceWrapperMember,
      choiceWrapperMemberField,
      activeChoiceWrapperForMembers,
    );
    if (!wrapper) return;

    if (wrapper.selectedMemberIndex === undefined && isNestedSelectedChoice) {
      const f = VisualizationUtilService.getField(nodeData);
      const parent = f?.parent;
      if (parent && 'wrapperKind' in parent && parent.wrapperKind === 'choice') {
        applyClearChoice(parent as IField);
        return;
      }
    }

    applyClearChoice(wrapper);
  }, [
    isChoiceWrapperMember,
    choiceWrapperMemberField,
    activeChoiceWrapperForMembers,
    isNestedSelectedChoice,
    nodeData,
    applyClearChoice,
  ]);

  const handleOpenChoiceModal = useCallback(() => {
    setIsChoiceModalOpen(true);
  }, []);

  // Case C: select this member within the parent choice wrapper
  const handleSelectSelfAsChoiceMember = useCallback(() => {
    if (!parentChoiceWrapperField || choiceMemberIndex === undefined) return;
    applyChoiceSelection(parentChoiceWrapperField, { memberIndex: choiceMemberIndex });
  }, [parentChoiceWrapperField, choiceMemberIndex, applyChoiceSelection]);

  const clearChoiceAction: MenuAction = {
    label: 'Clear selection',
    onClick: handleClearChoice,
    testId: 'clear-choice',
  };

  const selectSelfAction =
    isChoiceMember && !isSelectedChoice
      ? buildSelectSelfAction(
          choiceMemberField,
          parentChoiceWrapperField,
          handleSelectSelfAsChoiceMember,
          'select-choice-member',
          getFieldDisplayName,
        )
      : undefined;

  const changeMemberAction: MenuAction = {
    label: 'Select Member...',
    onClick: handleOpenChoiceModal,
    testId: 'change-choice-member',
  };

  const memberSelectedKey = useMemo<string | null>(
    () =>
      isChoiceWrapperMember
        ? resolveMemberSelectedKey(nodeData, choiceWrapperMemberField, dissolved, mappingTree.namespaceMap)
        : null,
    [isChoiceWrapperMember, nodeData, choiceWrapperMemberField, dissolved, mappingTree.namespaceMap],
  );

  const selectedModalKey = useMemo<string | null>(
    () => resolveSelectedModalKey(isChoiceWrapperMember, memberSelectedKey, activeChoiceWrapperForMembers, dissolved),
    [isChoiceWrapperMember, memberSelectedKey, activeChoiceWrapperForMembers, dissolved],
  );

  const menuGroups = buildMenuGroupsForChoiceNode({
    isChoiceWrapper,
    isChoiceWrapperMember,
    isNestedSelectedChoice,
    isSelectedChoice,
    dissolved,
    selectedModalKey,
    selectSelfAction,
    clearChoiceAction,
    changeMemberAction,
    onSelectChoiceMember: handleSelectChoiceMember,
    onOpenChoiceModal: handleOpenChoiceModal,
  });

  const closeChoiceModal = useCallback(() => {
    setIsChoiceModalOpen(false);
  }, []);

  const effectiveWrapper = resolveChoiceWrapper(
    isChoiceWrapperMember,
    choiceWrapperMemberField,
    activeChoiceWrapperForMembers,
  );
  const fieldName = effectiveWrapper?.displayName || effectiveWrapper?.name || 'Choice';

  return {
    groups: menuGroups,
    modals:
      isChoiceModalOpen && effectiveWrapper ? (
        <WrapperSelectionModal
          isOpen={isChoiceModalOpen}
          title={`Select member for ${fieldName}`}
          description={`Choose a member for ${fieldName}`}
          testId="choice-selection-modal"
          candidates={dissolved}
          selectedKey={selectedModalKey}
          onSelect={handleSelectChoiceMember}
          onClose={closeChoiceModal}
        />
      ) : null,
  };
}
