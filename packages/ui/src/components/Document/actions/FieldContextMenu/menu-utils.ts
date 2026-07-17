import { IField } from '../../../../models/datamapper/document';
import { FieldItem } from '../../../../models/datamapper/mapping';
import { DocumentService } from '../../../../services/document/document.service';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { WrapperActionService, WrapperCandidate } from '../../../../services/visualization/wrapper-action.service';
import { MenuAction } from '../FieldContextMenu';

function getFieldDisplayName(field: IField): string {
  return field.displayName || field.name;
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

interface CandidateEntry {
  candidate: WrapperCandidate;
  field: IField;
}

function resolveAbstractSubstitutes(abstractField: IField, namespaceMap: Record<string, string>): CandidateEntry[] {
  const subs = FieldOverrideService.getFieldSubstitutionCandidates(abstractField, namespaceMap);
  const entries: CandidateEntry[] = [];
  for (const [qname, info] of Object.entries(subs)) {
    const field = WrapperActionService.resolveCandidateField(abstractField, qname, subs, abstractField, namespaceMap);
    if (!field) continue;
    entries.push({
      candidate: {
        key: '',
        label: info.displayName,
        typeBadge: info.type,
        selection: { memberIndex: 0, substituteQName: qname },
      },
      field,
    });
  }
  return entries;
}

function resolveChoiceMembers(choiceField: IField, namespaceMap: Record<string, string>): CandidateEntry[] {
  const entries: CandidateEntry[] = [];
  for (const member of choiceField.fields) {
    if (member.wrapperKind === 'abstract') {
      entries.push(...resolveAbstractSubstitutes(member, namespaceMap));
    } else if (member.wrapperKind !== 'sequence') {
      entries.push({ candidate: WrapperActionService.fieldToCandidate(member, '', 0), field: member });
    }
  }
  return entries;
}

function resolveFieldEntries(child: IField, namespaceMap: Record<string, string>): CandidateEntry[] {
  if (child.wrapperKind === 'choice') return resolveChoiceMembers(child, namespaceMap);
  if (child.wrapperKind === 'abstract') return resolveAbstractSubstitutes(child, namespaceMap);
  return [{ candidate: WrapperActionService.fieldToCandidate(child, '', 0), field: child }];
}

function shouldSkipField(child: IField, forEachContext: boolean): boolean {
  if (!forEachContext) return false;
  return (
    child.wrapperKind !== 'choice' &&
    child.wrapperKind !== 'abstract' &&
    child.maxOccurs !== 'unbounded' &&
    Number(child.maxOccurs) <= 1
  );
}

function isSlotExhausted(child: IField, existingFieldItems: FieldItem[]): boolean {
  if (child.maxOccurs === 'unbounded') return false;
  const occupied = existingFieldItems.filter(
    (fi) => fi.field === child || DocumentService.isDescendant(child, fi.field),
  ).length;
  return occupied >= Number(child.maxOccurs);
}

export function computeAddFieldCandidates(
  schemaFields: IField[],
  namespaceMap: Record<string, string>,
  existingFieldItems: FieldItem[] = [],
  forEachContext = false,
): { candidates: WrapperCandidate[]; fields: IField[] } {
  const candidates: WrapperCandidate[] = [];
  const fields: IField[] = [];
  let index = 0;

  for (const child of schemaFields) {
    if (child.wrapperKind === 'sequence') {
      const nested = computeAddFieldCandidates(child.fields, namespaceMap, existingFieldItems, forEachContext);
      for (let i = 0; i < nested.candidates.length; i++) {
        candidates.push({
          ...nested.candidates[i],
          key: `${index}`,
          selection: { ...nested.candidates[i].selection, memberIndex: index },
        });
        fields.push(nested.fields[i]);
        index++;
      }
      continue;
    }

    if (shouldSkipField(child, forEachContext)) continue;
    if (isSlotExhausted(child, existingFieldItems)) continue;

    for (const { candidate, field } of resolveFieldEntries(child, namespaceMap)) {
      candidate.key = `${index}`;
      candidate.selection.memberIndex = index;
      candidates.push(candidate);
      fields.push(field);
      index++;
    }
  }

  return { candidates, fields };
}
