import { IField } from '../../../../models/datamapper/document';
import { IFieldSubstituteInfo } from '../../../../models/datamapper/types';
import { FieldItemNodeData, NodeData, TargetAbstractFieldNodeData } from '../../../../models/datamapper/visualization';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { VisualizationService } from '../../../../services/visualization/visualization.service';
import { VisualizationUtilService } from '../../../../services/visualization/visualization-util.service';
import { MenuAction } from '../FieldContextMenu';
import { WrapperCandidate } from './types';

const MAX_CHILDREN_PREVIEW = 3;

function getFieldDisplayName(field: IField): string {
  return field.displayName || field.name;
}

function childrenPreview(field: IField): string[] | undefined {
  const children = field.fields;
  if (!children || children.length === 0) return undefined;
  return children.slice(0, MAX_CHILDREN_PREVIEW).map((c) => c.displayName || c.name);
}

/**
 * Find the QName key for a field in the candidates map by matching namespace and local name.
 */
export function findCandidateQName(
  candidates: Record<string, IFieldSubstituteInfo>,
  field: IField,
): string | undefined {
  const entry = Object.entries(candidates).find(
    ([_, info]) => info.qname.getLocalPart() === field.name && info.qname.getNamespaceURI() === field.namespaceURI,
  );
  return entry?.[0];
}

/**
 * Resolves the concrete IField from the wrapper's children by QName. Returns the actual
 * document-tree field instance (not schema metadata) so callers can pass it directly to
 * {@link MappingService.updateFieldItemField}. Uses `cachedCandidates` when the wrapper
 * matches `knownWrapper` to avoid re-querying the schema collection on each call.
 */
export function resolveCandidateField(
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

export function resolveAbstractFieldInfo(nodeData: NodeData, namespaceMap: Record<string, string>): AbstractFieldInfo {
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
    candidateQName = findCandidateQName(candidates, field);
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

export function buildSelectSelfAction(
  memberField: IField | undefined,
  parentField: IField | undefined,
  onClick: () => void,
  testId: string,
  displayName: (field: IField) => string = getFieldDisplayName,
): MenuAction {
  const memberName = memberField ? displayName(memberField) : '';
  const parentName = parentField ? displayName(parentField) : undefined;
  return {
    label: parentName ? `Select '${memberName}' in '${parentName}'` : `Select '${memberName}'`,
    onClick,
    testId,
  };
}

function fieldToCandidate(field: IField, key: string, memberIndex: number): WrapperCandidate {
  const label =
    field.wrapperKind === 'choice' ? VisualizationService.getChoiceMemberLabel(field) : field.displayName || field.name;
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
export function dissolveChoiceMembers(members: IField[], namespaceMap: Record<string, string>): WrapperCandidate[] {
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
    return [fieldToCandidate(member, String(index), index)];
  });
}

/**
 * Builds candidate list for a standalone abstract wrapper field.
 * `memberIndex` is set to 0 — abstract wrappers have a single logical
 * member slot (the selected substitute replaces the wrapper).
 */
export function buildAbstractCandidates(
  abstractField: IField,
  namespaceMap: Record<string, string>,
): WrapperCandidate[] {
  const candidates = FieldOverrideService.getFieldSubstitutionCandidates(abstractField, namespaceMap);
  return Object.entries(candidates).map(([qname, info]) => ({
    key: qname,
    label: info.displayName,
    typeBadge: info.type,
    selection: { memberIndex: 0, substituteQName: qname },
  }));
}
