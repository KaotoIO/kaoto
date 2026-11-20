import { IField } from '../../models/datamapper/document';
import { IWrapperCandidate, IWrapperCandidateChild } from '../../models/datamapper/field-action';
import { FieldItem, InstructionItem } from '../../models/datamapper/mapping';
import { IFieldSubstituteInfo } from '../../models/datamapper/types';
import { TargetFieldNodeData, TargetNodeData } from '../../models/datamapper/visualization';
import { DocumentUtilService } from '../document/document-util.service';
import { FieldOverrideService } from '../document/field-override.service';
import { MappingService } from '../mapping/mapping.service';
import { formatQNameWithPrefix } from '../namespace-util';
import { MappingActionService } from './mapping-action.service';

/**
 * Shared base for {@link AbstractFieldService}, {@link ChoiceFieldService},
 * and {@link FieldCandidateService}. Provides `protected static` mapping
 * mutation helpers and candidate lookup utilities so the subservices can
 * focus on wrapper-type-specific logic without duplicating low-level code.
 */
export class WrapperBaseService {
  protected static readonly INLINE_SUBSTITUTION_LIMIT = 10;
  protected static readonly INLINE_CHOICE_LIMIT = 10;

  /**
   * Builds the details the selection modal shows for a candidate: qualified type name, description and direct children.
   * Members with a named type or a global element ref have no `fields` until their tree node is expanded, so the
   * children behind `namedTypeFragmentRefs` are read through {@link DocumentUtilService.collectTypeFragments}, which
   * does not change the field or the document.
   */
  protected static buildCandidateDetails(
    field: IField,
    namespaceMap: Record<string, string>,
  ): Pick<IWrapperCandidate, 'typeLabel' | 'description' | 'children'> {
    return {
      typeLabel: this.formatTypeLabel(field, namespaceMap),
      description: field.description,
      children: this.formatChildren(field, namespaceMap),
    };
  }

  /**
   * Details for a substitution candidate of an abstract wrapper. The wrapper holds the concrete substitutes as child
   * fields, so the matching child provides the details; when it is missing, only the type from `info` is known.
   */
  protected static buildSubstituteDetails(
    wrapperField: IField,
    qname: string,
    info: IFieldSubstituteInfo,
    candidates: Record<string, IFieldSubstituteInfo>,
    namespaceMap: Record<string, string>,
  ): Pick<IWrapperCandidate, 'typeLabel' | 'description' | 'children'> {
    const substitute = this.resolveCandidateField(wrapperField, qname, candidates, wrapperField, namespaceMap);
    if (substitute) return this.buildCandidateDetails(substitute, namespaceMap);
    return { typeLabel: formatQNameWithPrefix(info.typeQName, namespaceMap, info.type) };
  }

  private static formatTypeLabel(field: IField, namespaceMap: Record<string, string>): string {
    return formatQNameWithPrefix(field.typeQName, namespaceMap, field.type);
  }

  private static formatChildren(
    field: IField,
    namespaceMap: Record<string, string>,
  ): IWrapperCandidateChild[] | undefined {
    const unresolvedChildren =
      field.namedTypeFragmentRefs.length > 0
        ? DocumentUtilService.collectTypeFragments(field).fragments.flatMap((fragment) => fragment.fields)
        : [];
    const children = [...field.fields, ...unresolvedChildren];
    if (children.length === 0) return undefined;
    return children.map((c) => ({ name: c.displayName || c.name, typeLabel: this.formatTypeLabel(c, namespaceMap) }));
  }

  /** Matches by localPart + namespaceURI, not by field identity — substitution candidates are separate field instances. */
  protected static findCandidateQName(
    candidates: Record<string, IFieldSubstituteInfo>,
    field: IField,
  ): string | undefined {
    const entry = Object.entries(candidates).find(
      ([_, info]) => info.qname.getLocalPart() === field.name && info.qname.getNamespaceURI() === field.namespaceURI,
    );
    return entry?.[0];
  }

  /**
   * Finds the child field matching a substitution candidate QName within a
   * wrapper. When `wrapperField === knownWrapper`, reuses `cachedCandidates`
   * to avoid a redundant {@link FieldOverrideService.getFieldSubstitutionCandidates}
   * call — the hook typically resolves candidates once and passes them through.
   */
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

  /**
   * Creates or updates a per-instance member selection for a wrapper field. Unlike the
   * document-level selection (`selectedMemberQName`/`selectedMemberIndex`), this operates
   * on individual FieldItems. New FieldItems are marked `isUserCreated` so they survive
   * stale-mapping cleanup even before child mappings are created.
   */
  protected static applyTargetSelection(nodeData: TargetNodeData, selectedField: IField): void {
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
  protected static clearTargetSelection(nodeData: TargetNodeData, wrapperField: IField): void {
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
  protected static clearPerInstanceWrapperSelection(nodeData: TargetNodeData, wrapperField: IField): void {
    const existingMapping = nodeData.mapping;
    if (existingMapping instanceof FieldItem) {
      existingMapping.children = [];
      MappingService.updateFieldItemField(existingMapping, wrapperField);
      return;
    }
    this.clearTargetSelection(nodeData, wrapperField);
  }
}
