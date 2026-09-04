import { IField } from '../../models/datamapper/document';
import { IWrapperCandidate } from '../../models/datamapper/field-action';
import { FieldItem } from '../../models/datamapper/mapping';
import { DocumentService } from '../document/document.service';
import { FieldOverrideService } from '../document/field-override.service';
import { ChoiceFieldService } from './choice-field.service';
import { WrapperBaseService } from './wrapper-base.service';

interface CandidateEntry {
  candidate: IWrapperCandidate;
  field: IField;
}

/**
 * Builds the candidate list for the "Add field" modal in the mapping context
 * menu. Walks `schemaFields` and flattens wrapper layers: sequences are
 * dissolved recursively, choices and abstract wrappers are expanded into
 * their concrete members/substitutes. Fields whose `maxOccurs` slot is
 * already occupied by `existingFieldItems` are excluded. In `forEachContext`,
 * non-collection (maxOccurs=1) plain fields are skipped because for-each
 * iterates collections only.
 *
 * Returns parallel arrays: `candidates` for the modal UI and `fields` for
 * resolving the selected `memberIndex` back to the schema field.
 */
export class FieldCandidateService extends WrapperBaseService {
  static computeAddFieldCandidates(
    schemaFields: IField[],
    namespaceMap: Record<string, string>,
    existingFieldItems: FieldItem[] = [],
    forEachContext = false,
  ): { candidates: IWrapperCandidate[]; fields: IField[] } {
    const candidates: IWrapperCandidate[] = [];
    const fields: IField[] = [];
    let index = 0;

    for (const child of schemaFields) {
      if (child.wrapperKind === 'sequence') {
        const nested = this.computeAddFieldCandidates(child.fields, namespaceMap, existingFieldItems, forEachContext);
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

      if (this.shouldSkipField(child, forEachContext)) continue;
      if (this.isSlotExhausted(child, existingFieldItems)) continue;

      for (const { candidate, field } of this.resolveFieldEntries(child, namespaceMap)) {
        candidate.key = `${index}`;
        candidate.selection.memberIndex = index;
        candidates.push(candidate);
        fields.push(field);
        index++;
      }
    }

    return { candidates, fields };
  }

  private static resolveFieldEntries(child: IField, namespaceMap: Record<string, string>): CandidateEntry[] {
    if (child.wrapperKind === 'choice') return this.resolveChoiceMembers(child, namespaceMap);
    if (child.wrapperKind === 'abstract') return this.resolveAbstractSubstitutes(child, namespaceMap);
    return [{ candidate: ChoiceFieldService.fieldToCandidate(child, '', 0), field: child }];
  }

  private static resolveAbstractSubstitutes(
    abstractField: IField,
    namespaceMap: Record<string, string>,
  ): CandidateEntry[] {
    const subs = FieldOverrideService.getFieldSubstitutionCandidates(abstractField, namespaceMap);
    const entries: CandidateEntry[] = [];
    for (const [qname, info] of Object.entries(subs)) {
      const field = this.resolveCandidateField(abstractField, qname, subs, abstractField, namespaceMap);
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

  private static resolveChoiceMembers(choiceField: IField, namespaceMap: Record<string, string>): CandidateEntry[] {
    const entries: CandidateEntry[] = [];
    for (const member of choiceField.fields) {
      if (member.wrapperKind === 'abstract') {
        entries.push(...this.resolveAbstractSubstitutes(member, namespaceMap));
      } else if (member.wrapperKind === 'sequence') {
        for (const seqChild of member.fields) {
          if (seqChild.wrapperKind !== 'choice' && seqChild.wrapperKind !== 'abstract') {
            entries.push({ candidate: ChoiceFieldService.fieldToCandidate(seqChild, '', 0), field: seqChild });
          }
        }
      } else {
        entries.push({ candidate: ChoiceFieldService.fieldToCandidate(member, '', 0), field: member });
      }
    }
    return entries;
  }

  private static shouldSkipField(child: IField, forEachContext: boolean): boolean {
    if (!forEachContext) return false;
    return (
      child.wrapperKind !== 'choice' &&
      child.wrapperKind !== 'abstract' &&
      child.maxOccurs !== 'unbounded' &&
      Number(child.maxOccurs) <= 1
    );
  }

  private static isSlotExhausted(child: IField, existingFieldItems: FieldItem[]): boolean {
    if (child.maxOccurs === 'unbounded') return false;
    const occupied = existingFieldItems.filter(
      (fi) => fi.field === child || DocumentService.isDescendant(child, fi.field),
    ).length;
    return occupied >= Number(child.maxOccurs);
  }
}
