import { IField } from '../../../../models/datamapper/document';
import { IFieldSubstituteInfo } from '../../../../models/datamapper/types';
import { NodeData } from '../../../../models/datamapper/visualization';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { VisualizationUtilService } from '../../../../services/visualization/visualization-util.service';
import { MenuAction } from '../FieldContextMenu';

function getFieldDisplayName(field: IField): string {
  return field.displayName || field.name;
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

export interface AbstractFieldInfo {
  isAbstractWrapper: boolean;
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
  }

  return {
    isAbstractWrapper,
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
