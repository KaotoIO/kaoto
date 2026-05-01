import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useCallback, useMemo, useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { NodeData } from '../../../../models/datamapper/visualization';
import { ChoiceSelectionService } from '../../../../services/document/choice-selection.service';
import { VisualizationService } from '../../../../services/visualization/visualization.service';
import { VisualizationUtilService } from '../../../../services/visualization/visualization-util.service';
import { ChoiceSelectionModal } from '../ChoiceSelectionModal';
import { MenuAction, MenuGroup } from '../FieldContextMenu';
import { MenuContributor } from './types';

const INLINE_CHOICE_LIMIT = 10;

export function getFieldDisplayName(field: IField): string {
  return field.wrapperKind === 'choice'
    ? VisualizationService.getChoiceMemberLabel(field)
    : field.displayName || field.name;
}

function buildSelectSelfAction(
  choiceMemberField: IField | undefined,
  parentChoiceWrapperField: IField | undefined,
  onClick: () => void,
): MenuAction {
  const memberName = choiceMemberField ? getFieldDisplayName(choiceMemberField) : '';
  const parentName = parentChoiceWrapperField ? getFieldDisplayName(parentChoiceWrapperField) : undefined;
  return {
    label: parentName ? `Select '${memberName}' in '${parentName}'` : `Select '${memberName}'`,
    onClick,
    testId: 'select-choice-member',
  };
}

function buildInlineMemberActions(
  members: IField[],
  selectedIndex: number | undefined,
  onSelect: (index: number) => void,
): MenuAction[] {
  return members.map((member, index) => ({
    label: getFieldDisplayName(member),
    onClick: () => onSelect(index),
    icon: selectedIndex === index ? <CheckIcon /> : <Choices />,
    testId: `choice-menu-item-${index}`,
  }));
}

function buildChoiceWrapperMenuGroups(
  choiceWrapperField: IField | undefined,
  selectSelfAction: MenuAction | undefined,
  clearChoiceAction: MenuAction,
  handleSelectChoiceMember: (index: number) => void,
  handleOpenChoiceModal: () => void,
): MenuGroup[] {
  const members = choiceWrapperField?.fields ?? [];
  const selectedIndex = choiceWrapperField?.selectedMemberIndex;

  if (members.length === 0 && selectedIndex === undefined) {
    return selectSelfAction ? [{ actions: [selectSelfAction] }] : [];
  }

  const membersGroup: MenuGroup =
    members.length <= INLINE_CHOICE_LIMIT
      ? { actions: buildInlineMemberActions(members, selectedIndex, handleSelectChoiceMember) }
      : { actions: [{ label: 'Select Member...', onClick: handleOpenChoiceModal, testId: 'open-choice-modal' }] };

  const hasSelection = selectedIndex !== undefined;
  return [
    { actions: selectSelfAction ? [selectSelfAction] : [] },
    membersGroup,
    { actions: hasSelection ? [clearChoiceAction] : [] },
  ];
}

export function useChoiceContextMenu(nodeData: NodeData): MenuContributor {
  const { mappingTree, updateDocument } = useDataMapper();

  const field = VisualizationUtilService.getField(nodeData);
  const isChoiceWrapper = VisualizationUtilService.isUnselectedChoiceField(nodeData);

  // Case B: selected choice wrapper — field is the selected member, choiceField is the wrapper
  const isSelectedChoice = VisualizationUtilService.isSelectedChoiceField(nodeData);

  // Case C: choice member child — field whose parent is a choice wrapper.
  // Can overlap with Case A and Case B. For selected choices (Case B), the member
  // of the outer choice is the wrapper itself (choiceField), not the selected member (field).
  const choiceMemberField =
    VisualizationUtilService.isChoiceField(nodeData) && nodeData.choiceField ? nodeData.choiceField : field;
  const choiceMemberParent =
    choiceMemberField?.parent && 'wrapperKind' in choiceMemberField.parent ? choiceMemberField.parent : undefined;
  const isChoiceMember = choiceMemberParent?.wrapperKind === 'choice';

  // The parent choice wrapper for Case C (the outer wrapper that contains this member)
  const parentChoiceWrapperField = isChoiceMember ? choiceMemberParent : undefined;

  // The index of this member within the parent choice wrapper (Case C)
  const choiceMemberIndex =
    isChoiceMember && parentChoiceWrapperField && choiceMemberField
      ? parentChoiceWrapperField.fields.indexOf(choiceMemberField)
      : undefined;

  // The choice wrapper field for Case A (this node's own wrapper — for member list)
  let choiceWrapperField: IField | undefined;
  if (isChoiceWrapper) {
    choiceWrapperField = field;
  } else if (isSelectedChoice) {
    choiceWrapperField = nodeData.choiceField;
  }

  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  const applyChoiceSelection = useCallback(
    (wrapper: IField, selectedIndex: number) => {
      const doc = wrapper.ownerDocument;
      ChoiceSelectionService.setChoiceSelection(doc, wrapper, selectedIndex, mappingTree.namespaceMap);
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [mappingTree.namespaceMap, updateDocument],
  );

  const applyClearChoice = useCallback(
    (wrapper: IField) => {
      const doc = wrapper.ownerDocument;
      ChoiceSelectionService.clearChoiceSelection(doc, wrapper, mappingTree.namespaceMap);
      const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
      updateDocument(doc, doc.definition, previousRefId);
    },
    [mappingTree.namespaceMap, updateDocument],
  );

  // Case A: select a member from this node's own wrapper member list
  const handleSelectChoiceMember = useCallback(
    (selectedIndex: number) => {
      if (!choiceWrapperField) return;
      applyChoiceSelection(choiceWrapperField, selectedIndex);
    },
    [choiceWrapperField, applyChoiceSelection],
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
    applyChoiceSelection(parentChoiceWrapperField, choiceMemberIndex);
  }, [parentChoiceWrapperField, choiceMemberIndex, applyChoiceSelection]);

  const selectSelfAction = isChoiceMember
    ? buildSelectSelfAction(choiceMemberField, parentChoiceWrapperField, handleSelectSelfAsChoiceMember)
    : undefined;

  const menuGroups = useMemo(() => {
    const clearChoiceAction: MenuAction = {
      label: 'Show All Choice Options',
      onClick: handleClearChoice,
      testId: 'clear-choice',
    };

    if (isChoiceWrapper) {
      return buildChoiceWrapperMenuGroups(
        choiceWrapperField,
        selectSelfAction,
        clearChoiceAction,
        handleSelectChoiceMember,
        handleOpenChoiceModal,
      );
    }

    const choiceActions: MenuAction[] = [];
    if (isSelectedChoice) choiceActions.push(clearChoiceAction);
    if (selectSelfAction) choiceActions.push(selectSelfAction);

    return [{ actions: choiceActions }];
  }, [
    isChoiceWrapper,
    isSelectedChoice,
    choiceWrapperField,
    selectSelfAction,
    handleClearChoice,
    handleSelectChoiceMember,
    handleOpenChoiceModal,
  ]);

  const closeChoiceModal = useCallback(() => {
    setIsChoiceModalOpen(false);
  }, []);

  return {
    groups: menuGroups,
    modals:
      isChoiceModalOpen && choiceWrapperField ? (
        <ChoiceSelectionModal
          isOpen={isChoiceModalOpen}
          choiceField={choiceWrapperField}
          onSelect={handleSelectChoiceMember}
          onClose={closeChoiceModal}
        />
      ) : null,
  };
}
