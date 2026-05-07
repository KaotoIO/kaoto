import { TypeaheadItem } from '@kaoto/forms';
import { FunctionComponent, useMemo } from 'react';

import { IField } from '../../../models/datamapper/document';
import { IFieldSubstituteInfo } from '../../../models/datamapper/types';
import { findCandidateQName } from './FieldContextMenu/menu-utils';
import { MemberSelectionModal } from './MemberSelectionModal';

export interface SubstitutionSelectionModalProps {
  isOpen: boolean;
  abstractField: IField;
  candidates: Record<string, IFieldSubstituteInfo>;
  onSelect: (qname: string) => void;
  onClose: () => void;
}

export const SubstitutionSelectionModal: FunctionComponent<SubstitutionSelectionModalProps> = ({
  isOpen,
  abstractField,
  candidates,
  onSelect,
  onClose,
}) => {
  const fieldName = abstractField.displayName || abstractField.name || 'Abstract';

  const items: TypeaheadItem<string>[] = useMemo(
    () =>
      Object.entries(candidates).map(([qname, info]) => ({
        name: info.displayName,
        value: qname,
      })),
    [candidates],
  );

  const selectedValue = useMemo(() => {
    if (abstractField.selectedMemberIndex === undefined) return null;
    const selectedField = abstractField.fields[abstractField.selectedMemberIndex];
    if (!selectedField) return null;
    return findCandidateQName(candidates, selectedField) ?? null;
  }, [abstractField.selectedMemberIndex, abstractField.fields, candidates]);

  return (
    <MemberSelectionModal<string>
      isOpen={isOpen}
      title={`Substitution: ${fieldName}`}
      placeholder="Select a substitute..."
      testId="substitution-member-select"
      items={items}
      selectedValue={selectedValue}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
};
