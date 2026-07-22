import { IField } from '../../models/datamapper/document';
import { FieldItem, InstructionItem } from '../../models/datamapper/mapping';
import { FieldOverrideVariant, IFieldSubstituteInfo, Types } from '../../models/datamapper/types';
import {
  FieldItemNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { DocumentUtilService } from '../document/document-util.service';
import { FieldOverrideService } from '../document/field-override.service';
import { WrapperSelectionService } from '../document/wrapper-selection.service';
import { MappingService } from '../mapping/mapping.service';
import { SchemaPathService } from '../schema-path.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationService } from './visualization.service';
import { VisualizationUtilService } from './visualization-util.service';

export interface MemberSelection {
  memberIndex: number;
  substituteQName?: string;
}

export interface WrapperCandidate {
  key: string;
  label: string;
  typeBadge: Types;
  description?: string;
  childrenPreview?: string[];
  selection: MemberSelection;
}

export interface AbstractFieldInfo {
  isAbstractWrapper: boolean;
  isAbstractWrapperMember: boolean;
  isSelectedSubstitution: boolean;
  isSubstitutionCandidate: boolean;
  abstractWrapperField: IField | undefined;
  field: IField | undefined;
  parentAbstractField: IField | undefined;
  candidateQName: string | undefined;
}

const MAX_CHILDREN_PREVIEW = 3;

function childrenPreview(field: IField): string[] | undefined {
  const children = field.fields;
  if (!children || children.length === 0) return undefined;
  return children.slice(0, MAX_CHILDREN_PREVIEW).map((c) => c.displayName || c.name);
}

/**
 * Unified service for wrapper-related (abstract/choice) field actions.
 * Absorbs all framework-independent business logic that was previously scattered
 * across useAbstractFieldSubstitutionMenu, useChoiceContextMenu, useFieldOverrideMenu,
 * menu-utils, and revert-override — leaving hooks as thin UI adapters.
 */
export class WrapperActionService {
  // ── Group A: Field Classification / Resolution ──

  private static findCandidateQName(
    candidates: Record<string, IFieldSubstituteInfo>,
    field: IField,
  ): string | undefined {
    const entry = Object.entries(candidates).find(
      ([_, info]) => info.qname.getLocalPart() === field.name && info.qname.getNamespaceURI() === field.namespaceURI,
    );
    return entry?.[0];
  }

  static resolveCandidateField(
    wrapperField: IField,
    qname: string,
    cachedCandidates: Record<string, IFieldSubstituteInfo>,
    knownWrapper: IField | undefined,
    namespaceMap: Record<string, string>,
  ): IField | undefined {
    const resolvedCandidates =
      wrapperField === knownWrapper
        ? cachedCandidates
        : FieldOverrideService.getFieldSubstitutionCandidates(wrapperField, namespaceMap);
    const candidate = resolvedCandidates[qname];
    if (!candidate) return undefined;
    return wrapperField.fields?.find(
      (f) => f.name === candidate.qname.getLocalPart() && f.namespaceURI === candidate.qname.getNamespaceURI(),
    );
  }

  static resolveAbstractFieldInfo(nodeData: NodeData, namespaceMap: Record<string, string>): AbstractFieldInfo {
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
      candidateQName = WrapperActionService.findCandidateQName(candidates, field);
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

  // ── Group B: Candidate Building ──

  static fieldToCandidate(field: IField, key: string, memberIndex: number): WrapperCandidate {
    const label =
      field.wrapperKind === 'choice'
        ? VisualizationService.getChoiceMemberLabel(field)
        : field.displayName || field.name;
    return {
      key,
      label,
      typeBadge: field.type,
      description: field.description,
      childrenPreview: childrenPreview(field),
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
  static dissolveChoiceMembers(members: IField[], namespaceMap: Record<string, string>): WrapperCandidate[] {
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
      return [WrapperActionService.fieldToCandidate(member, String(index), index)];
    });
  }

  /**
   * Builds candidate list for a standalone abstract wrapper field.
   * `memberIndex` is set to 0 — abstract wrappers have a single logical
   * member slot (the selected substitute replaces the wrapper).
   */
  static buildAbstractCandidates(abstractField: IField, namespaceMap: Record<string, string>): WrapperCandidate[] {
    const candidates = FieldOverrideService.getFieldSubstitutionCandidates(abstractField, namespaceMap);
    return Object.entries(candidates).map(([qname, info]) => ({
      key: qname,
      label: info.displayName,
      typeBadge: info.type,
      selection: { memberIndex: 0, substituteQName: qname },
    }));
  }

  // ── Group C: Abstract Substitution Orchestration ──

  static resolveSubstitutionCandidates(
    abstractWrapperField: IField | undefined,
    namespaceMap: Record<string, string>,
  ): Record<string, IFieldSubstituteInfo> {
    if (!abstractWrapperField) return {};
    return FieldOverrideService.getFieldSubstitutionCandidates(abstractWrapperField, namespaceMap);
  }

  static resolveSelectedQName(
    abstractWrapperField: IField | undefined,
    candidates: Record<string, IFieldSubstituteInfo>,
  ): string | undefined {
    if (!abstractWrapperField) return undefined;
    const selectedField = DocumentUtilService.getSelectedMember(abstractWrapperField);
    return selectedField ? WrapperActionService.findCandidateQName(candidates, selectedField) : undefined;
  }

  static resolveMemberSelectedQName(
    isAbstractWrapperMember: boolean,
    field: IField | undefined,
    abstractWrapperField: IField | undefined,
    candidates: Record<string, IFieldSubstituteInfo>,
  ): string | undefined {
    if (!isAbstractWrapperMember || !field || !abstractWrapperField) return undefined;
    return WrapperActionService.findCandidateQName(candidates, field);
  }

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
      WrapperActionService.applyPerInstanceAbstractSubstitution(
        nodeData,
        wrapperField,
        qname,
        candidates,
        abstractWrapperField,
        namespaceMap,
      );
      return;
    }
    WrapperActionService.applyDocumentLevelAbstractSubstitution(
      nodeData,
      wrapperField,
      qname,
      namespaceMap,
      isTargetSide,
    );
  }

  static clearAbstractSubstitution(
    nodeData: NodeData,
    wrapperField: IField,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide && wrapperField.maxOccurs !== 1) {
      WrapperActionService.clearPerInstanceWrapperSelection(nodeData as TargetNodeData, wrapperField);
      return;
    }
    WrapperActionService.clearDocumentLevelAbstractSubstitution(nodeData, wrapperField, namespaceMap, isTargetSide);
  }

  private static applyPerInstanceAbstractSubstitution(
    nodeData: NodeData,
    wrapperField: IField,
    qname: string,
    candidates: Record<string, IFieldSubstituteInfo>,
    abstractWrapperField: IField | undefined,
    namespaceMap: Record<string, string>,
  ): void {
    const candidateField = WrapperActionService.resolveCandidateField(
      wrapperField,
      qname,
      candidates,
      abstractWrapperField,
      namespaceMap,
    );
    if (candidateField) {
      WrapperActionService.applyTargetSelection(nodeData as TargetNodeData, candidateField);
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
    if (selectedMember) WrapperActionService.applyTargetSelection(nodeData as TargetNodeData, selectedMember);
  }

  /**
   * Clears a document-level abstract substitution, reverting the wrapper to its
   * unresolved state. When the abstract wrapper is nested inside a choice wrapper,
   * the parent choice selection is also cleared — the choice's selectedMemberIndex
   * still points at the abstract member, which is now unresolved, leaving the
   * choice state inconsistent if not cleared.
   */
  private static clearDocumentLevelAbstractSubstitution(
    nodeData: NodeData,
    wrapperField: IField,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide) WrapperActionService.clearTargetSelection(nodeData as TargetNodeData, wrapperField);
    const doc = wrapperField.ownerDocument;
    const schemaPath = SchemaPathService.build(wrapperField, namespaceMap);
    DocumentUtilService.invalidateDescendants(doc, schemaPath);
    FieldOverrideService.revertFieldSubstitution(wrapperField, namespaceMap);

    const parentChoice = WrapperSelectionService.findParentWrapper(wrapperField, 'choice');
    if (parentChoice) {
      WrapperSelectionService.clearChoiceSelection(doc, parentChoice, namespaceMap);
    }
  }

  // ── Group D: Choice Selection Orchestration ──

  static getChoiceFieldDisplayName(field: IField): string {
    return field.wrapperKind === 'choice'
      ? VisualizationService.getChoiceMemberLabel(field)
      : field.displayName || field.name;
  }

  static dispatchChoiceSelection(
    nodeData: NodeData,
    wrapper: IField,
    selection: MemberSelection,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide && wrapper.maxOccurs !== 1) {
      WrapperActionService.applyPerInstanceChoiceSelection(nodeData, wrapper, selection, namespaceMap);
      return;
    }
    WrapperActionService.applyDocumentLevelChoiceSelection(nodeData, wrapper, selection, namespaceMap, isTargetSide);
  }

  static clearChoiceSelectionOnField(
    nodeData: NodeData,
    wrapper: IField,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide && wrapper.maxOccurs !== 1) {
      WrapperActionService.clearPerInstanceWrapperSelection(nodeData as TargetNodeData, wrapper);
      return;
    }
    WrapperActionService.clearDocumentLevelChoiceSelection(nodeData, wrapper, namespaceMap, isTargetSide);
  }

  static resolveChoiceWrapper(
    isChoiceWrapperMember: boolean,
    choiceWrapperMemberField: IField | undefined,
    fallback: IField | undefined,
  ): IField | undefined {
    return isChoiceWrapperMember ? choiceWrapperMemberField : fallback;
  }

  static resolveMemberSelectedKey(
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
        const substituteQName = WrapperActionService.findCandidateQName(candidates, memberField);
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

  static resolveSelectedModalKey(
    isChoiceWrapperMember: boolean,
    memberSelectedKey: string | null,
    activeChoiceWrapperForMembers: IField | undefined,
    dissolved: WrapperCandidate[],
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

  private static applyPerInstanceChoiceSelection(
    nodeData: NodeData,
    wrapper: IField,
    selection: MemberSelection,
    namespaceMap: Record<string, string>,
  ): void {
    let candidateField: IField | undefined = wrapper.fields[selection.memberIndex];
    if (selection.substituteQName && candidateField) {
      candidateField = WrapperActionService.resolveCandidateField(
        candidateField,
        selection.substituteQName,
        {},
        undefined,
        namespaceMap,
      );
    }
    if (candidateField) {
      WrapperActionService.applyTargetSelection(nodeData as TargetNodeData, candidateField);
    }
  }

  private static applyDocumentLevelChoiceSelection(
    nodeData: NodeData,
    wrapper: IField,
    selection: MemberSelection,
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
        WrapperActionService.applyTargetSelection(nodeData as TargetNodeData, candidateField);
      }
    }
  }

  private static clearDocumentLevelChoiceSelection(
    nodeData: NodeData,
    wrapper: IField,
    namespaceMap: Record<string, string>,
    isTargetSide: boolean,
  ): void {
    if (isTargetSide) WrapperActionService.clearTargetSelection(nodeData as TargetNodeData, wrapper);
    WrapperSelectionService.clearDescendantWrapperSelections(wrapper, namespaceMap);
    const doc = wrapper.ownerDocument;
    const schemaPath = SchemaPathService.build(wrapper, namespaceMap);
    DocumentUtilService.invalidateDescendants(doc, schemaPath);
    WrapperSelectionService.clearChoiceSelection(doc, wrapper, namespaceMap);
  }

  // ── Group E: Mapping Mutations (moved from MappingActionService) ──

  /**
   * Creates or updates a per-instance member selection for a wrapper field. Unlike the
   * document-level selection (`selectedMemberQName`/`selectedMemberIndex`), this operates
   * on individual FieldItems. New FieldItems are marked `isUserCreated` so they survive
   * stale-mapping cleanup even before child mappings are created.
   */
  private static applyTargetSelection(nodeData: TargetNodeData, selectedField: IField): void {
    const existingMapping = nodeData.mapping;
    if (existingMapping instanceof FieldItem) {
      MappingService.updateFieldItemField(existingMapping, selectedField);
    } else {
      const parentItem = MappingActionService.getOrCreateFieldItem((nodeData as TargetFieldNodeData).parent);
      const fieldItem = MappingService.createFieldItem(parentItem, selectedField);
      fieldItem.isUserCreated = true;
    }
  }

  /**
   * When the FieldItem lives inside an InstructionItem (xsl:if, xsl:when, etc.), it is
   * reverted to the wrapper field rather than removed. This preserves the instruction
   * structure while still producing the correct "unconfigured" visual state — because
   * {@link VisualizationService.isUnconfiguredTargetWrapper} only inspects direct children
   * of the nearest non-wrapper ancestor mapping, a FieldItem nested inside an instruction
   * is invisible to that check. Without an instruction, the FieldItem must be removed so
   * `isUnconfiguredTargetWrapper` returns true; keeping it would bypass that gate and
   * render all candidates below a wrapper that has no expand arrow.
   */
  private static clearTargetSelection(nodeData: TargetNodeData, wrapperField: IField): void {
    const existingMapping = nodeData.mapping;
    if (existingMapping instanceof FieldItem) {
      existingMapping.children = [];
      if (existingMapping.parent instanceof InstructionItem) {
        MappingService.updateFieldItemField(existingMapping, wrapperField);
      } else {
        existingMapping.parent.children = existingMapping.parent.children.filter((child) => child !== existingMapping);
      }
    }
  }

  /**
   * Reverts a per-instance wrapper selection without removing the FieldItem.
   * Unlike {@link clearTargetSelection}, which may remove the FieldItem entirely
   * (when not inside an InstructionItem), this method always keeps the slot and
   * reverts its field back to `wrapperField`. Used by collection (maxOccurs>1)
   * abstract and choice wrappers where each FieldItem represents an independent
   * instance that should be preserved.
   */
  private static clearPerInstanceWrapperSelection(nodeData: TargetNodeData, wrapperField: IField): void {
    const existingMapping = nodeData.mapping;
    if (existingMapping instanceof FieldItem) {
      existingMapping.children = [];
      MappingService.updateFieldItemField(existingMapping, wrapperField);
      return;
    }
    WrapperActionService.clearTargetSelection(nodeData, wrapperField);
  }

  // ── Group F: Revert Override ──

  /**
   * Revert a field override (type override or substitution) without opening the modal.
   * Mutation only — callers handle `updateDocument` separately.
   */
  static revertOverride(field: IField, namespaceMap: Record<string, string>): void {
    const hasAbstractSubstitution = field.wrapperKind === 'abstract' && field.selectedMemberQName !== undefined;
    if (field.typeOverride === FieldOverrideVariant.NONE && !hasAbstractSubstitution) return;

    if (hasAbstractSubstitution || field.typeOverride === FieldOverrideVariant.SUBSTITUTION) {
      FieldOverrideService.revertFieldSubstitution(field, namespaceMap);
    } else {
      FieldOverrideService.revertFieldTypeOverride(field, namespaceMap);
    }
  }

  /**
   * Resolves the full choice context for a given node — which wrapper it belongs to,
   * whether it's a selected member, a per-instance wrapper member, etc. Pure read,
   * no side effects. Used by {@link useChoiceContextMenu} to determine what menu
   * actions to offer.
   */
  static resolveChoiceNodeInfo(nodeData: NodeData): ChoiceNodeInfo {
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
}

/**
 * Full choice context resolved for a given node. Each field captures one aspect
 * of the node's relationship to choice wrappers.
 *
 * @property isChoiceWrapper - The node's own field has `wrapperKind === 'choice'`
 * @property isSelectedChoice - The node is a choice field with a selected member (flattened view)
 * @property isChoiceMember - The node's field is a direct child of a choice wrapper
 * @property isChoiceWrapperMember - The node is a per-instance FieldItem belonging to a collection wrapper
 * @property activeChoiceWrapperForMembers - The choice wrapper whose members should be offered in the context menu
 * @property effectiveChoiceWrapper - The wrapper that governs this node (wrapper member takes priority)
 * @property choiceWrapperField - The outermost selected choice wrapper (walks up through nested choices)
 * @property choiceWrapperMemberField - The wrapper field from a per-instance FieldItem
 * @property choiceMemberField - The field representing this node as a choice member
 * @property parentChoiceWrapperField - The parent choice wrapper field if this node is a direct member
 * @property choiceMemberIndex - The 0-based index of this member within its parent choice
 */
export interface ChoiceNodeInfo {
  isChoiceWrapper: boolean;
  isSelectedChoice: boolean;
  isChoiceMember: boolean;
  isChoiceWrapperMember: boolean;
  activeChoiceWrapperForMembers: IField | undefined;
  effectiveChoiceWrapper: IField | undefined;
  choiceWrapperField: IField | undefined;
  choiceWrapperMemberField: IField | undefined;
  choiceMemberField: IField | undefined;
  parentChoiceWrapperField: IField | undefined;
  choiceMemberIndex: number | undefined;
}
