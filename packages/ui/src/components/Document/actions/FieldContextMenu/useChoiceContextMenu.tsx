import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { NodeData, TargetNodeData } from '../../../../models/datamapper/visualization';
import { ChoiceSelectionService } from '../../../../services/document/choice-selection.service';
import { DocumentUtilService } from '../../../../services/document/document-util.service';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { SchemaPathService } from '../../../../services/schema-path.service';
import { MappingActionService } from '../../../../services/visualization/mapping-action.service';
import { VisualizationService } from '../../../../services/visualization/visualization.service';
import { VisualizationUtilService } from '../../../../services/visualization/visualization-util.service';
import { MenuAction, MenuGroup } from '../FieldContextMenu';
import { WrapperSelectionModal } from '../WrapperSelectionModal';
import { buildSelectSelfAction, dissolveChoiceMembers } from './menu-utils';
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

interface ChoiceNodeInfo {
  isChoiceWrapper: boolean;
  isSelectedChoice: boolean;
  isChoiceMember: boolean;
  activeChoiceWrapperForMembers: IField | undefined;
  choiceWrapperField: IField | undefined;
  choiceMemberField: IField | undefined;
  parentChoiceWrapperField: IField | undefined;
  choiceMemberIndex: number | undefined;
}

function resolveChoiceNodeInfo(nodeData: NodeData): ChoiceNodeInfo {
  const field = VisualizationUtilService.getField(nodeData);
  const isChoiceWrapper = field?.wrapperKind === 'choice';
  const isSelectedChoice = VisualizationUtilService.isSelectedChoiceField(nodeData);

  const choiceMemberField =
    VisualizationUtilService.isChoiceField(nodeData) && nodeData.choiceField ? nodeData.choiceField : field;
  const choiceMemberParent =
    choiceMemberField?.parent && 'wrapperKind' in choiceMemberField.parent ? choiceMemberField.parent : undefined;
  const isChoiceMember = choiceMemberParent?.wrapperKind === 'choice';
  const parentChoiceWrapperField = isChoiceMember ? choiceMemberParent : undefined;
  const choiceMemberIndex =
    isChoiceMember && parentChoiceWrapperField && choiceMemberField
      ? parentChoiceWrapperField.fields.indexOf(choiceMemberField)
      : undefined;

  let choiceWrapperField: IField | undefined;
  if (isSelectedChoice) {
    choiceWrapperField = VisualizationUtilService.resolveOutermostSelectedWrapper(nodeData.choiceField).outermost;
  } else if (isChoiceWrapper) {
    choiceWrapperField = field;
  }
  const activeChoiceWrapperForMembers = isSelectedChoice && isChoiceWrapper ? field : choiceWrapperField;

  return {
    isChoiceWrapper,
    isSelectedChoice,
    isChoiceMember,
    activeChoiceWrapperForMembers,
    choiceWrapperField,
    choiceMemberField,
    parentChoiceWrapperField,
    choiceMemberIndex,
  };
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
    activeChoiceWrapperForMembers,
    choiceWrapperField,
    choiceMemberField,
    parentChoiceWrapperField,
    choiceMemberIndex,
  } = resolveChoiceNodeInfo(nodeData);

  const isNestedSelectedChoice = isSelectedChoice && isChoiceWrapper;
  const isTargetSide = !nodeData.isSource;

  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  const dissolved = useMemo(() => {
    const members = activeChoiceWrapperForMembers?.fields ?? [];
    return dissolveChoiceMembers(members, mappingTree.namespaceMap);
  }, [activeChoiceWrapperForMembers?.fields, mappingTree.namespaceMap]);

  const applyChoiceSelection = useCallback(
    (wrapper: IField, selection: MemberSelection) => {
      const doc = wrapper.ownerDocument;
      ChoiceSelectionService.setChoiceSelection(doc, wrapper, selection.memberIndex, mappingTree.namespaceMap);

      if (selection.substituteQName) {
        const abstractMember = wrapper.fields[selection.memberIndex];
        if (abstractMember) {
          FieldOverrideService.applyFieldSubstitution(
            abstractMember,
            selection.substituteQName,
            mappingTree.namespaceMap,
          );
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

      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [isTargetSide, mappingTree.namespaceMap, nodeData, updateDocument],
  );

  const clearDescendantSelections = useCallback(
    (field: IField) => {
      const member = DocumentUtilService.getSelectedMember(field);
      if (!member) return;
      if (member.wrapperKind === 'choice' && member.selectedMemberIndex !== undefined) {
        clearDescendantSelections(member);
        member.selectedMemberIndex = undefined;
      }
      if (member.wrapperKind === 'abstract' && member.selectedMemberQName) {
        FieldOverrideService.revertFieldSubstitution(member, mappingTree.namespaceMap);
      }
    },
    [mappingTree.namespaceMap],
  );

  const applyClearChoice = useCallback(
    (wrapper: IField) => {
      if (isTargetSide) MappingActionService.clearTargetSelection(nodeData as TargetNodeData, wrapper);

      clearDescendantSelections(wrapper);

      const doc = wrapper.ownerDocument;
      const schemaPath = SchemaPathService.build(wrapper, mappingTree.namespaceMap);
      DocumentUtilService.invalidateDescendants(doc, schemaPath);
      ChoiceSelectionService.clearChoiceSelection(doc, wrapper, mappingTree.namespaceMap);
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [clearDescendantSelections, isTargetSide, mappingTree.namespaceMap, nodeData, updateDocument],
  );

  // Case A: select a member from this node's own wrapper member list
  const handleSelectChoiceMember = useCallback(
    (selection: MemberSelection) => {
      if (!activeChoiceWrapperForMembers) return;
      applyChoiceSelection(activeChoiceWrapperForMembers, selection);
    },
    [activeChoiceWrapperForMembers, applyChoiceSelection],
  );

  // Case A/B: clear selection on this node's wrapper (or the selected wrapper)
  const handleClearChoice = useCallback(() => {
    if (!choiceWrapperField) return;
    applyClearChoice(choiceWrapperField);
  }, [choiceWrapperField, applyClearChoice]);

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

  const selectedModalKey = useMemo<string | null>(() => {
    const idx = activeChoiceWrapperForMembers?.selectedMemberIndex;
    if (idx === undefined) return null;
    const member = activeChoiceWrapperForMembers?.fields[idx];
    const substituteQName = member?.selectedMemberQName?.toString();
    return (
      dissolved.find((d) => d.selection.memberIndex === idx && d.selection.substituteQName === substituteQName)?.key ??
      null
    );
  }, [activeChoiceWrapperForMembers, dissolved]);

  let menuGroups: MenuGroup[];
  if (isChoiceWrapper) {
    menuGroups = buildChoiceWrapperMenuGroups(
      dissolved,
      selectedModalKey,
      selectSelfAction,
      clearChoiceAction,
      handleSelectChoiceMember,
      handleOpenChoiceModal,
    );
    if (isNestedSelectedChoice) {
      menuGroups.push({ actions: [clearChoiceAction, changeMemberAction] });
    }
  } else {
    const choiceActions: MenuAction[] = [];
    if (isSelectedChoice) {
      choiceActions.push(clearChoiceAction, changeMemberAction);
    }
    if (selectSelfAction) choiceActions.push(selectSelfAction);
    menuGroups = [{ actions: choiceActions }];
  }

  const closeChoiceModal = useCallback(() => {
    setIsChoiceModalOpen(false);
  }, []);

  const fieldName = activeChoiceWrapperForMembers?.displayName || activeChoiceWrapperForMembers?.name || 'Choice';

  return {
    groups: menuGroups,
    modals:
      isChoiceModalOpen && activeChoiceWrapperForMembers ? (
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
