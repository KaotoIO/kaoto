import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { useState } from 'react';

import { useDataMapper } from '../../../../hooks/useDataMapper';
import { IField } from '../../../../models/datamapper/document';
import { IFieldMenuAction, IMemberSelection } from '../../../../models/datamapper/field-action';
import { NodeData } from '../../../../models/datamapper/visualization';
import { ChoiceFieldService } from '../../../../services/visualization/choice-field.service';
import { VisualizationUtilService } from '../../../../services/visualization/visualization-util.service';
import { buildSelectSelfAction } from './menu-utils';
import { MenuContributor } from './types';
import { WrapperSelectionModal } from './WrapperSelectionModal';

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
  } = ChoiceFieldService.resolveInfo(nodeData);

  const isNestedSelectedChoice = isSelectedChoice && isChoiceWrapper;
  const isTargetSide = !nodeData.isSource;

  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);

  const dissolved = (() => {
    const members = effectiveChoiceWrapper?.fields ?? [];
    return ChoiceFieldService.dissolveChoiceMembers(members, mappingTree.namespaceMap);
  })();

  const applyChoiceSelection = (wrapper: IField, selection: IMemberSelection) => {
    ChoiceFieldService.dispatchChoiceSelection(nodeData, wrapper, selection, mappingTree.namespaceMap, isTargetSide);
    const doc = wrapper.ownerDocument;
    const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
    updateDocument(doc, doc.definition, previousRefId);
  };

  const applyClearChoice = (wrapper: IField) => {
    ChoiceFieldService.clearChoiceSelectionOnField(nodeData, wrapper, mappingTree.namespaceMap, isTargetSide);
    const doc = wrapper.ownerDocument;
    const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
    updateDocument(doc, doc.definition, previousRefId);
  };

  // Case A: select a member from this node's own wrapper member list
  const handleSelectChoiceMember = (selection: IMemberSelection) => {
    const wrapper = ChoiceFieldService.resolveChoiceWrapper(
      isChoiceWrapperMember,
      choiceWrapperMemberField,
      activeChoiceWrapperForMembers,
    );
    if (!wrapper) return;
    applyChoiceSelection(wrapper, selection);
  };

  // Case A/B: clear selection on this node's active wrapper, cascading to parent when empty
  const handleClearChoice = () => {
    const wrapper = ChoiceFieldService.resolveChoiceWrapper(
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
  };

  const handleOpenChoiceModal = () => {
    setIsChoiceModalOpen(true);
  };

  // Case C: select this member within the parent choice wrapper
  const handleSelectSelfAsChoiceMember = () => {
    if (!parentChoiceWrapperField || choiceMemberIndex === undefined) return;
    applyChoiceSelection(parentChoiceWrapperField, { memberIndex: choiceMemberIndex });
  };

  const clearChoiceAction: IFieldMenuAction = {
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
          ChoiceFieldService.getChoiceFieldDisplayName,
        )
      : undefined;

  const changeMemberAction: IFieldMenuAction = {
    label: 'Select Member...',
    onClick: handleOpenChoiceModal,
    testId: 'change-choice-member',
  };

  const memberSelectedKey = isChoiceWrapperMember
    ? ChoiceFieldService.resolveMemberSelectedKey(
        nodeData,
        choiceWrapperMemberField,
        dissolved,
        mappingTree.namespaceMap,
      )
    : null;

  const selectedModalKey = ChoiceFieldService.resolveSelectedModalKey(
    isChoiceWrapperMember,
    memberSelectedKey,
    activeChoiceWrapperForMembers,
    dissolved,
  );

  const menuGroups = ChoiceFieldService.buildMenuGroups({
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
    selectedIcon: <CheckIcon />,
    unselectedIcon: <Choices />,
  });

  const closeChoiceModal = () => {
    setIsChoiceModalOpen(false);
  };

  const effectiveWrapper = ChoiceFieldService.resolveChoiceWrapper(
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
