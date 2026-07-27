import type { ReactNode } from 'react';

import { IField } from '../../models/datamapper/document';
import {
  IChoiceMenuGroupsConfig,
  IChoiceNodeInfo,
  IFieldMenuAction,
  IFieldMenuGroup,
  IMemberSelection,
  IWrapperCandidate,
} from '../../models/datamapper/field-action';
import {
  FieldItemNodeData,
  NodeData,
  TargetChoiceFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { DocumentUtilService } from '../document/document-util.service';
import { FieldOverrideService } from '../document/field-override.service';
import { WrapperSelectionService } from '../document/wrapper-selection.service';
import { SchemaPathService } from '../schema-path.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';
import { WrapperBaseService } from './wrapper-base.service';

/**
 * Owns all choice-wrapper (xs:choice) selection logic for the DataMapper
 * visualization layer. A choice wrapper groups mutually exclusive fields;
 * exactly one member can be selected at a time via `selectedMemberIndex`.
 *
 * Selection uses a two-track dispatch shared with {@link AbstractFieldService}:
 * - **Per-instance** (target side, maxOccurs>1): each {@link FieldItem}
 *   carries its own selected member, so multiple collection instances can
 *   pick different branches.
 * - **Document-level** (source side, or maxOccurs=1): sets
 *   `selectedMemberIndex` on the wrapper field itself, affecting all
 *   instances.
 */
export class ChoiceFieldService extends WrapperBaseService {
  /**
   * Classifies the node's relationship to choice wrappers — outermost
   * wrapper, nested selected choices, per-instance FieldItem members.
   * The returned flags drive which context menu actions the hook offers.
   */
  static resolveInfo(nodeData: NodeData): IChoiceNodeInfo {
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
      choiceWrapperField = WrapperSelectionService.resolveOutermostSelectedWrapper(nodeData.choiceField).outermost;
    } else if (isChoiceWrapper) {
      choiceWrapperField = field;
    }
    const activeChoiceWrapperForMembers = isSelectedChoice && isChoiceWrapper ? field : choiceWrapperField;

    const isChoiceWrapperMember = VisualizationUtilService.isChoiceWrapperMember(nodeData);
    const choiceWrapperMemberField =
      isChoiceWrapperMember && nodeData instanceof FieldItemNodeData
        ? (nodeData.wrapperField ?? ((nodeData.parent as TargetChoiceFieldNodeData).field as IField))
        : undefined;
    const effectiveChoiceWrapper = isChoiceWrapperMember ? choiceWrapperMemberField : activeChoiceWrapperForMembers;

    return {
      isChoiceWrapper,
      isSelectedChoice,
      isChoiceMember,
      isChoiceWrapperMember,
      activeChoiceWrapperForMembers,
      effectiveChoiceWrapper,
      choiceWrapperField,
      choiceWrapperMemberField,
      choiceMemberField,
      parentChoiceWrapperField,
      choiceMemberIndex,
    };
  }

  static getChoiceFieldDisplayName(field: IField): string {
    return field.wrapperKind === 'choice'
      ? VisualizationService.getChoiceMemberLabel(field)
      : field.displayName || field.name;
  }

  /** Converts a schema field into an {@link IWrapperCandidate} for inline menus and the selection modal. */
  static fieldToCandidate(field: IField, key: string, memberIndex: number): IWrapperCandidate {
    const label =
      field.wrapperKind === 'choice'
        ? VisualizationService.getChoiceMemberLabel(field)
        : field.displayName || field.name;
    return {
      key,
      label,
      typeBadge: field.type,
      description: field.description,
      childrenPreview: this.formatChildrenPreview(field),
      selection: { memberIndex },
    };
  }

  /**
   * Dissolves abstract members within a choice wrapper into their concrete
   * substitution candidates. Non-abstract members pass through unchanged.
   *
   * Abstract-in-choice dissolution ensures users pick a concrete type directly
   * without navigating through the intermediate abstract element. On confirm,
   * both `selectedMemberIndex` and `selectedMemberQName` are set in one action.
   */
  static dissolveChoiceMembers(members: IField[], namespaceMap: Record<string, string>): IWrapperCandidate[] {
    return members.flatMap((member, index) => {
      if (member.wrapperKind === 'abstract') {
        const candidates = FieldOverrideService.getFieldSubstitutionCandidates(member, namespaceMap);
        return Object.entries(candidates).map(([qname, info]) => ({
          key: `${index}:${qname}`,
          label: info.displayName,
          typeBadge: info.type,
          selection: { memberIndex: index, substituteQName: qname },
        }));
      }
      if (member.wrapperKind === 'sequence') return [];
      return [this.fieldToCandidate(member, String(index), index)];
    });
  }

  static resolveChoiceWrapper(
    isChoiceWrapperMember: boolean,
    choiceWrapperMemberField: IField | undefined,
    fallback: IField | undefined,
  ): IField | undefined {
    return isChoiceWrapperMember ? choiceWrapperMemberField : fallback;
  }

  /**
   * For per-instance FieldItem members, resolves which dissolved candidate
   * key matches the current FieldItem's field. Handles abstract-in-choice
   * by looking up the parent abstract wrapper's substitution candidates.
   */
  static resolveMemberSelectedKey(
    nodeData: NodeData,
    choiceWrapperMemberField: IField | undefined,
    dissolved: IWrapperCandidate[],
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
        const substituteQName = this.findCandidateQName(candidates, memberField);
        return (
          dissolved.find(
            (d) => d.selection.memberIndex === parentIdx && d.selection.substituteQName === substituteQName,
          )?.key ?? null
        );
      }
      return null;
    }
    return dissolved.find((d) => d.selection.memberIndex === idx && !d.selection.substituteQName)?.key ?? null;
  }

  /**
   * Determines which candidate key to highlight in the selection modal.
   * Per-instance members delegate to {@link resolveMemberSelectedKey};
   * document-level reads `selectedMemberIndex` from the wrapper field.
   */
  static resolveSelectedModalKey(
    isChoiceWrapperMember: boolean,
    memberSelectedKey: string | null,
    activeChoiceWrapperForMembers: IField | undefined,
    dissolved: IWrapperCandidate[],
  ): string | null {
    if (isChoiceWrapperMember) return memberSelectedKey;
    const idx = activeChoiceWrapperForMembers?.selectedMemberIndex;
    if (idx === undefined) return null;
    const member = activeChoiceWrapperForMembers?.fields[idx];
    const substituteQName = member?.wrapperKind === 'abstract' ? member.selectedMemberQName?.toString() : undefined;
    return (
      dissolved.find((d) => d.selection.memberIndex === idx && d.selection.substituteQName === substituteQName)?.key ??
      null
    );
  }

  /**
   * Applies a choice member selection. Routes to per-instance (target side,
   * maxOccurs>1) or document-level based on context.
   */
  static dispatchChoiceSelection(
    nodeData: NodeData,
    wrapper: IField,
    selection: IMemberSelection,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide && wrapper.maxOccurs !== 1) {
      this.applyPerInstanceChoiceSelection(nodeData, wrapper, selection, namespaceMap);
      return;
    }
    this.applyDocumentLevelChoiceSelection(nodeData, wrapper, selection, namespaceMap, isTargetSide);
  }

  /** Clears a choice selection. Routes to per-instance or document-level. */
  static clearChoiceSelectionOnField(
    nodeData: NodeData,
    wrapper: IField,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide && wrapper.maxOccurs !== 1) {
      this.clearPerInstanceWrapperSelection(nodeData as TargetNodeData, wrapper);
      return;
    }
    this.clearDocumentLevelChoiceSelection(nodeData, wrapper, namespaceMap, isTargetSide);
  }

  /**
   * Assembles context menu action groups from the pre-built config. Stays
   * React-free — icons and callbacks are injected through the config.
   */
  static buildMenuGroups(config: IChoiceMenuGroupsConfig): IFieldMenuGroup[] {
    if (config.isChoiceWrapper || config.isChoiceWrapperMember) {
      const groups = this.buildChoiceWrapperMenuGroups(config);
      if (config.isNestedSelectedChoice)
        groups.push({ actions: [config.clearChoiceAction, config.changeMemberAction] });
      return groups;
    }
    const choiceActions: IFieldMenuAction[] = [];
    if (config.isSelectedChoice) choiceActions.push(config.clearChoiceAction, config.changeMemberAction);
    if (config.selectSelfAction) choiceActions.push(config.selectSelfAction);
    return [{ actions: choiceActions }];
  }

  private static applyPerInstanceChoiceSelection(
    nodeData: NodeData,
    wrapper: IField,
    selection: IMemberSelection,
    namespaceMap: Record<string, string>,
  ): void {
    let candidateField: IField | undefined = wrapper.fields[selection.memberIndex];
    if (selection.substituteQName && candidateField) {
      candidateField = this.resolveCandidateField(
        candidateField,
        selection.substituteQName,
        {},
        undefined,
        namespaceMap,
      );
    }
    if (candidateField) {
      this.applyTargetSelection(nodeData as TargetNodeData, candidateField);
    }
  }

  /**
   * Sets `selectedMemberIndex` on the wrapper via {@link WrapperSelectionService},
   * then handles the abstract-in-choice case: when `substituteQName` is present,
   * also applies the substitution on the abstract member so both the choice
   * branch and the concrete type are resolved in a single dispatch.
   *
   * This is one half of the abstract-in-choice cascade — the apply direction.
   * The clear direction lives in
   * {@link AbstractFieldService.clearDocumentLevelAbstractSubstitution}.
   */
  private static applyDocumentLevelChoiceSelection(
    nodeData: NodeData,
    wrapper: IField,
    selection: IMemberSelection,
    namespaceMap: Record<string, string>,
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
        this.applyTargetSelection(nodeData as TargetNodeData, candidateField);
      }
    }
  }

  private static clearDocumentLevelChoiceSelection(
    nodeData: NodeData,
    wrapper: IField,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide) this.clearTargetSelection(nodeData as TargetNodeData, wrapper);
    WrapperSelectionService.clearDescendantWrapperSelections(wrapper, namespaceMap);
    const doc = wrapper.ownerDocument;
    const schemaPath = SchemaPathService.build(wrapper, namespaceMap);
    DocumentUtilService.invalidateDescendants(doc, schemaPath);
    WrapperSelectionService.clearChoiceSelection(doc, wrapper, namespaceMap);
  }

  private static buildChoiceWrapperMenuGroups(config: IChoiceMenuGroupsConfig): IFieldMenuGroup[] {
    const selectSelfAction = config.isChoiceWrapperMember ? undefined : config.selectSelfAction;

    if (config.dissolved.length === 0 && config.selectedModalKey === null) {
      return selectSelfAction ? [{ actions: [selectSelfAction] }] : [];
    }

    const membersGroup: IFieldMenuGroup =
      config.dissolved.length <= this.INLINE_CHOICE_LIMIT
        ? {
            actions: this.buildInlineMemberActions(
              config.dissolved,
              config.selectedModalKey,
              config.onSelectChoiceMember,
              config.selectedIcon,
              config.unselectedIcon,
            ),
          }
        : { actions: [{ label: 'Select Member...', onClick: config.onOpenChoiceModal, testId: 'open-choice-modal' }] };

    const hasSelection = config.selectedModalKey !== null;
    return [
      { actions: selectSelfAction ? [selectSelfAction] : [] },
      membersGroup,
      { actions: hasSelection ? [config.clearChoiceAction] : [] },
    ];
  }

  private static buildInlineMemberActions(
    dissolvedMembers: IWrapperCandidate[],
    selectedKey: string | null,
    onSelect: (selection: IMemberSelection) => void,
    selectedIcon: ReactNode,
    unselectedIcon: ReactNode,
  ): IFieldMenuAction[] {
    return dissolvedMembers.map(({ key, label, selection }) => ({
      label,
      onClick: () => {
        onSelect(selection);
      },
      icon: selectedKey === key ? selectedIcon : unselectedIcon,
      testId: selection.substituteQName
        ? 'choice-menu-item-' + selection.memberIndex + '-' + selection.substituteQName
        : 'choice-menu-item-' + selection.memberIndex,
    }));
  }
}
