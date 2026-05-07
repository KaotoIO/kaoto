import { TypeaheadItem } from '@kaoto/forms';
import { FunctionComponent, useMemo } from 'react';

import { IField } from '../../../models/datamapper/document';
import { MemberSelectionModal } from './MemberSelectionModal';

export interface ChoiceSelectionModalProps {
  isOpen: boolean;
  choiceField: IField;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export const ChoiceSelectionModal: FunctionComponent<ChoiceSelectionModalProps> = ({
  isOpen,
  choiceField,
  onSelect,
  onClose,
}) => {
  const members = useMemo(() => choiceField.fields ?? [], [choiceField.fields]);
  const fieldName = choiceField.displayName || choiceField.name || 'Choice';

  const items: TypeaheadItem<number>[] = useMemo(
    () =>
      members.map((member, index) => ({
        name: member.displayName || member.name,
        value: index,
      })),
    [members],
  );

  return (
    <MemberSelectionModal<number>
      isOpen={isOpen}
      title={`Choice: ${fieldName}`}
      placeholder="Select a member..."
      testId="choice-member-select"
      items={items}
      selectedValue={choiceField.selectedMemberIndex ?? null}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
};
