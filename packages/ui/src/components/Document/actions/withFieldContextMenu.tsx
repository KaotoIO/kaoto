import { Choices } from '@carbon/icons-react';
import { CheckIcon } from '@patternfly/react-icons';
import { ComponentType, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { IField } from '../../../models/datamapper/document';
import { DocumentTreeNode } from '../../../models/datamapper/document-tree-node';
import { FieldOverrideVariant } from '../../../models/datamapper/types';
import {
  AbstractFieldNodeData,
  ChoiceFieldNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
} from '../../../models/datamapper/visualization';
import { ChoiceSelectionService } from '../../../services/document/choice-selection.service';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { ChoiceSelectionModal } from './ChoiceSelectionModal';
import { FieldContextMenu, MenuAction, MenuGroup } from './FieldContextMenu';
import { FieldOverride } from './FieldOverride/FieldOverride';
import { revertOverride } from './FieldOverride/revert-override';

type WithTreeNode = {
  treeNode: DocumentTreeNode;
  isReadOnly?: boolean;
};

const INLINE_CHOICE_LIMIT = 10;

function getChoiceWrapperField(
  field: IField | undefined,
  nodeData: NodeData,
  isChoiceWrapper: boolean,
  isSelectedChoice: boolean,
): IField | undefined {
  if (isChoiceWrapper) return field;
  if (isSelectedChoice) return (nodeData as ChoiceFieldNodeData | TargetChoiceFieldNodeData).choiceField;
  return undefined;
}

function getFieldDisplayName(field: IField): string {
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

/**
 * HOC that adds a field override context menu to a document node component.
 *
 * Injects an `onContextMenu` prop into the wrapped component. The component
 * only needs to forward it to its container element — no context menu logic inside.
 *
 * @example
 * ```tsx
 * export const SourceDocumentNodeWithContextMenu = withFieldContextMenu(SourceDocumentNode);
 * ```
 */
export function withFieldContextMenu<P extends WithTreeNode>(
  Component: ComponentType<P & { onContextMenu?: (event: MouseEvent) => void }>,
) {
  const WithContextMenu = (props: P) => {
    const { treeNode, isReadOnly } = props;
    const { mappingTree, updateDocument, refreshMappingTree } = useDataMapper();

    const nodeData = treeNode.nodeData;
    const field = VisualizationUtilService.getField(nodeData);
    const abstractWrapperField =
      nodeData instanceof AbstractFieldNodeData || nodeData instanceof TargetAbstractFieldNodeData
        ? nodeData.abstractField
        : undefined;
    const hasFieldOverride = !!field && (field.typeOverride !== FieldOverrideVariant.NONE || !!abstractWrapperField);

    // Case A: unselected choice wrapper — show all members to pick from
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
    const choiceWrapperField = getChoiceWrapperField(field, nodeData, isChoiceWrapper, isSelectedChoice);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const closeMenu = useCallback(() => setIsMenuOpen(false), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);
    const closeChoiceModal = useCallback(() => setIsChoiceModalOpen(false), []);

    useEffect(() => {
      if (!isMenuOpen) return;

      const handleDismiss = (e: globalThis.MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setIsMenuOpen(false);
        }
      };
      const handleEscape = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') setIsMenuOpen(false);
      };

      document.addEventListener('mousedown', handleDismiss);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleDismiss);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isMenuOpen]);

    const handleContextMenu = useCallback(
      (event: MouseEvent) => {
        if (!field || isReadOnly) return;
        event.preventDefault();
        event.stopPropagation();
        setMenuPosition({ x: event.clientX, y: event.clientY });
        setIsMenuOpen(true);
      },
      [field, isReadOnly],
    );

    const handleOverrideType = useCallback(() => {
      setIsModalOpen(true);
    }, []);

    const handleResetOverride = useCallback(() => {
      const revertTarget = abstractWrapperField ?? field;
      if (revertTarget) {
        revertOverride(revertTarget, mappingTree.namespaceMap, updateDocument);
        refreshMappingTree();
      }
    }, [abstractWrapperField, field, mappingTree.namespaceMap, updateDocument, refreshMappingTree]);

    const applyChoiceSelection = useCallback(
      (wrapper: IField, selectedIndex: number) => {
        const doc = wrapper.ownerDocument;
        ChoiceSelectionService.setChoiceSelection(doc, wrapper, selectedIndex, mappingTree.namespaceMap);
        const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
        updateDocument(doc, doc.definition, previousRefId);
        refreshMappingTree();
      },
      [mappingTree.namespaceMap, updateDocument, refreshMappingTree],
    );

    const applyClearChoice = useCallback(
      (wrapper: IField) => {
        const doc = wrapper.ownerDocument;
        ChoiceSelectionService.clearChoiceSelection(doc, wrapper, mappingTree.namespaceMap);
        const previousRefId = doc.getReferenceId(mappingTree.namespaceMap);
        updateDocument(doc, doc.definition, previousRefId);
        refreshMappingTree();
      },
      [mappingTree.namespaceMap, updateDocument, refreshMappingTree],
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
      const wrapper = choiceWrapperField;
      if (!wrapper) return;
      applyClearChoice(wrapper);
    }, [choiceWrapperField, applyClearChoice]);

    const handleOpenChoiceModal = useCallback(() => {
      setIsChoiceModalOpen(true);
    }, []);

    // Case C: select this member within the parent choice wrapper
    const handleSelectSelfAsChoiceMember = useCallback(() => {
      if (!parentChoiceWrapperField || choiceMemberIndex === undefined) return;
      applyChoiceSelection(parentChoiceWrapperField, choiceMemberIndex);
    }, [parentChoiceWrapperField, choiceMemberIndex, applyChoiceSelection]);

    const menuGroups = useMemo(() => {
      const clearChoiceAction: MenuAction = {
        label: 'Show All Choice Options',
        onClick: handleClearChoice,
        testId: 'clear-choice',
      };
      const selectSelfAction = isChoiceMember
        ? buildSelectSelfAction(choiceMemberField, parentChoiceWrapperField, handleSelectSelfAsChoiceMember)
        : undefined;

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

      return [
        { actions: choiceActions },
        { actions: [{ label: 'Override Field...', onClick: handleOverrideType, testId: 'field-override' }] },
        hasFieldOverride
          ? { actions: [{ label: 'Reset Override', onClick: handleResetOverride, testId: 'field-reset-override' }] }
          : { actions: [] },
      ];
    }, [
      isChoiceWrapper,
      isSelectedChoice,
      isChoiceMember,
      choiceWrapperField,
      choiceMemberField,
      parentChoiceWrapperField,
      hasFieldOverride,
      handleSelectChoiceMember,
      handleSelectSelfAsChoiceMember,
      handleOpenChoiceModal,
      handleClearChoice,
      handleOverrideType,
      handleResetOverride,
    ]);

    return (
      <>
        <Component {...props} onContextMenu={handleContextMenu} />

        {isMenuOpen && field && (
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              left: menuPosition.x,
              top: menuPosition.y,
              zIndex: 1000,
            }}
          >
            <FieldContextMenu groups={menuGroups} onClose={closeMenu} />
          </div>
        )}

        {isChoiceModalOpen && choiceWrapperField && (
          <ChoiceSelectionModal
            isOpen={isChoiceModalOpen}
            choiceField={choiceWrapperField}
            onSelect={handleSelectChoiceMember}
            onClose={closeChoiceModal}
          />
        )}

        {isModalOpen && field && (
          <FieldOverride
            isOpen={isModalOpen}
            field={abstractWrapperField ?? field}
            onComplete={refreshMappingTree}
            onClose={closeModal}
          />
        )}
      </>
    );
  };

  WithContextMenu.displayName = `WithContextMenu(${Component.displayName || Component.name || 'Component'})`;
  return WithContextMenu;
}
