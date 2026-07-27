import type { ReactNode } from 'react';

import { IField } from '../../models/datamapper/document';
import {
  IAbstractFieldInfo,
  IAbstractMenuGroupsConfig,
  IFieldMenuAction,
  IFieldMenuGroup,
  IWrapperCandidate,
} from '../../models/datamapper/field-action';
import { IFieldSubstituteInfo } from '../../models/datamapper/types';
import {
  FieldItemNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { DocumentUtilService } from '../document/document-util.service';
import { FieldOverrideService } from '../document/field-override.service';
import { WrapperSelectionService } from '../document/wrapper-selection.service';
import { SchemaPathService } from '../schema-path.service';
import { VisualizationUtilService } from './visualization-util.service';
import { WrapperBaseService } from './wrapper-base.service';

/**
 * Owns all abstract-wrapper (xsi:type substitution) logic for the DataMapper
 * visualization layer. An abstract wrapper represents an XML element declared
 * with `abstract="true"` whose concrete type is chosen at mapping time via
 * `selectedMemberQName`.
 *
 * Selection uses a two-track dispatch shared with {@link ChoiceFieldService}:
 * - **Per-instance** (target side, maxOccurs>1): each {@link FieldItem}
 *   carries its own selection, so multiple collection instances can pick
 *   different substitutes.
 * - **Document-level** (source side, or maxOccurs=1): sets
 *   `selectedMemberQName` on the field itself, affecting all instances.
 */
export class AbstractFieldService extends WrapperBaseService {
  /**
   * Classifies the node's relationship to abstract wrappers. The returned
   * flags drive which context menu actions the hook offers — e.g. "select
   * substitute" vs "clear substitution" vs "select self as candidate".
   */
  static resolveInfo(nodeData: NodeData, namespaceMap: Record<string, string>): IAbstractFieldInfo {
    const field = VisualizationUtilService.getField(nodeData);
    const isAbstractWrapper = field?.wrapperKind === 'abstract';
    const isAbstractWrapperMember = VisualizationUtilService.isAbstractWrapperMember(nodeData);
    const isSelectedSubstitution = VisualizationUtilService.isAbstractField(nodeData);

    const candidateParent = field?.parent && 'wrapperKind' in field.parent ? field.parent : undefined;
    const isSubstitutionCandidate = candidateParent?.wrapperKind === 'abstract';
    const parentAbstractField = isSubstitutionCandidate ? candidateParent : undefined;

    let candidateQName: string | undefined;
    if (field && parentAbstractField) {
      const candidates = FieldOverrideService.getFieldSubstitutionCandidates(parentAbstractField, namespaceMap);
      candidateQName = this.findCandidateQName(candidates, field);
    }

    let abstractWrapperField: IField | undefined;
    if (isAbstractWrapper) {
      abstractWrapperField = field;
    } else if (isSelectedSubstitution) {
      abstractWrapperField = nodeData.abstractField;
    } else if (isAbstractWrapperMember && nodeData instanceof FieldItemNodeData) {
      abstractWrapperField = nodeData.wrapperField ?? (nodeData.parent as TargetAbstractFieldNodeData).field;
    }

    return {
      isAbstractWrapper,
      isAbstractWrapperMember,
      isSelectedSubstitution,
      isSubstitutionCandidate,
      abstractWrapperField,
      field,
      parentAbstractField,
      candidateQName,
    };
  }

  /** Returns substitution candidates for the wrapper, or `{}` when no wrapper is present. */
  static resolveSubstitutionCandidates(
    abstractWrapperField: IField | undefined,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldSubstituteInfo> {
    if (!abstractWrapperField) return {};
    return FieldOverrideService.getFieldSubstitutionCandidates(abstractWrapperField, namespaceMap);
  }

  /** Returns the candidate QName matching the document-level selected member, if any. */
  static resolveSelectedQName(
    abstractWrapperField: IField | undefined,
    candidates: Record<string, IFieldSubstituteInfo>,
  ): string | undefined {
    if (!abstractWrapperField) return undefined;
    const selectedField = DocumentUtilService.getSelectedMember(abstractWrapperField);
    return selectedField ? this.findCandidateQName(candidates, selectedField) : undefined;
  }

  /**
   * Per-instance variant of {@link resolveSelectedQName}: returns the
   * candidate QName for a FieldItem member within a collection wrapper.
   */
  static resolveMemberSelectedQName(
    isAbstractWrapperMember: boolean,
    field: IField | undefined,
    abstractWrapperField: IField | undefined,
    candidates: Record<string, IFieldSubstituteInfo>,
  ): string | undefined {
    if (!isAbstractWrapperMember || !field || !abstractWrapperField) return undefined;
    return this.findCandidateQName(candidates, field);
  }

  /**
   * Applies a substitution selection. Routes to per-instance (target side,
   * maxOccurs>1) or document-level based on context.
   */
  static applyAbstractSubstitution(
    nodeData: NodeData,
    wrapperField: IField,
    qname: string,
    candidates: Record<string, IFieldSubstituteInfo>,
    abstractWrapperField: IField | undefined,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide && wrapperField.maxOccurs !== 1) {
      this.applyPerInstanceAbstractSubstitution(
        nodeData,
        wrapperField,
        qname,
        candidates,
        abstractWrapperField,
        namespaceMap,
      );
      return;
    }
    this.applyDocumentLevelAbstractSubstitution(nodeData, wrapperField, qname, namespaceMap, isTargetSide);
  }

  /**
   * Clears a substitution selection. Routes to per-instance or document-level.
   * Document-level clear cascades to the parent choice wrapper when present.
   */
  static clearAbstractSubstitution(
    nodeData: NodeData,
    wrapperField: IField,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide && wrapperField.maxOccurs !== 1) {
      this.clearPerInstanceWrapperSelection(nodeData as TargetNodeData, wrapperField);
      return;
    }
    this.clearDocumentLevelAbstractSubstitution(nodeData, wrapperField, namespaceMap, isTargetSide);
  }

  /** Builds {@link IWrapperCandidate} entries for the substitution selection modal. */
  static buildAbstractCandidates(abstractField: IField, namespaceMap: Record<string, string>): IWrapperCandidate[] {
    const candidates = FieldOverrideService.getFieldSubstitutionCandidates(abstractField, namespaceMap);
    return Object.entries(candidates).map(([qname, info]) => ({
      key: qname,
      label: info.displayName,
      typeBadge: info.type,
      selection: { memberIndex: 0, substituteQName: qname },
    }));
  }

  /**
   * Assembles context menu action groups from the pre-built config. Stays
   * React-free — icons and callbacks are injected through the config so
   * this `.ts` service never imports JSX.
   */
  static buildMenuGroups(config: IAbstractMenuGroupsConfig): IFieldMenuGroup[] {
    if (config.isInsideChoiceWrapper && config.isAbstractWrapper) {
      const hasSelection = config.selectedQName !== undefined;
      return hasSelection ? [{ actions: [config.clearSubstitutionAction] }] : [];
    }
    if (config.isAbstractWrapper || config.isAbstractWrapperMember) {
      return this.buildAbstractWrapperMenuGroups(config);
    }
    const substitutionActions: IFieldMenuAction[] = [];
    if (config.isSelectedSubstitution)
      substitutionActions.push(config.clearSubstitutionAction, config.changeSubstituteAction);
    if (config.selectSelfAction) substitutionActions.push(config.selectSelfAction);
    return [{ actions: substitutionActions }];
  }

  private static applyPerInstanceAbstractSubstitution(
    nodeData: NodeData,
    wrapperField: IField,
    qname: string,
    candidates: Record<string, IFieldSubstituteInfo>,
    abstractWrapperField: IField | undefined,
    namespaceMap: Record<string, string>,
  ): void {
    const candidateField = this.resolveCandidateField(
      wrapperField,
      qname,
      candidates,
      abstractWrapperField,
      namespaceMap,
    );
    if (candidateField) {
      this.applyTargetSelection(nodeData as TargetNodeData, candidateField);
    }
  }

  private static applyDocumentLevelAbstractSubstitution(
    nodeData: NodeData,
    wrapperField: IField,
    qname: string,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    FieldOverrideService.applyFieldSubstitution(wrapperField, qname, namespaceMap);
    if (!isTargetSide) return;
    const selectedMember = DocumentUtilService.getSelectedMember(wrapperField);
    if (selectedMember) this.applyTargetSelection(nodeData as TargetNodeData, selectedMember);
  }

  /**
   * Clears a document-level abstract substitution, reverting the wrapper to its
   * unresolved state. When the abstract wrapper is nested inside a choice wrapper,
   * the parent choice selection is also cleared — the choice's selectedMemberIndex
   * still points at the abstract member, which is now unresolved, leaving the
   * choice state inconsistent if not cleared.
   *
   * This is one half of the abstract-in-choice cascade — the clear direction.
   * The apply direction lives in
   * {@link ChoiceFieldService.applyDocumentLevelChoiceSelection}.
   */
  private static clearDocumentLevelAbstractSubstitution(
    nodeData: NodeData,
    wrapperField: IField,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide) this.clearTargetSelection(nodeData as TargetNodeData, wrapperField);
    const doc = wrapperField.ownerDocument;
    const schemaPath = SchemaPathService.build(wrapperField, namespaceMap);
    DocumentUtilService.invalidateDescendants(doc, schemaPath);
    FieldOverrideService.revertFieldSubstitution(wrapperField, namespaceMap);

    const parentChoice = WrapperSelectionService.findParentWrapper(wrapperField, 'choice');
    if (parentChoice) {
      WrapperSelectionService.clearChoiceSelection(doc, parentChoice, namespaceMap);
    }
  }

  private static buildAbstractWrapperMenuGroups(config: IAbstractMenuGroupsConfig): IFieldMenuGroup[] {
    const selectedQName = config.isAbstractWrapperMember ? config.memberSelectedQName : config.selectedQName;
    const selectSelfAction = config.isAbstractWrapperMember ? undefined : config.selectSelfAction;
    const candidateCount = Object.keys(config.candidates).length;

    if (candidateCount === 0 && selectedQName === undefined) {
      return selectSelfAction ? [{ actions: [selectSelfAction] }] : [];
    }

    const candidatesGroup: IFieldMenuGroup =
      candidateCount <= this.INLINE_SUBSTITUTION_LIMIT
        ? {
            actions: this.buildInlineSubstitutionActions(
              config.candidates,
              selectedQName,
              config.onSelectSubstitution,
              config.selectedIcon,
              config.unselectedIcon,
            ),
          }
        : {
            actions: [
              {
                label: 'Select Substitute...',
                onClick: config.onOpenSubstitutionModal,
                testId: 'open-substitution-modal',
              },
            ],
          };

    const hasSelection = selectedQName !== undefined;
    return [
      { actions: selectSelfAction ? [selectSelfAction] : [] },
      candidatesGroup,
      { actions: hasSelection ? [config.clearSubstitutionAction] : [] },
    ];
  }

  private static buildInlineSubstitutionActions(
    candidates: Record<string, IFieldSubstituteInfo>,
    selectedQName: string | undefined,
    onSelect: (qname: string) => void,
    selectedIcon: ReactNode,
    unselectedIcon: ReactNode,
  ): IFieldMenuAction[] {
    return Object.entries(candidates).map(([qname, info]) => ({
      label: info.displayName,
      onClick: () => {
        onSelect(qname);
      },
      icon: selectedQName === qname ? selectedIcon : unselectedIcon,
      testId: `substitution-menu-item-${qname}`,
    }));
  }
}
