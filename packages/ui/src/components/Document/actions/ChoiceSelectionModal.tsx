import { Typeahead, TypeaheadItem } from '@kaoto/forms';
import { Button, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { IField } from '../../../models/datamapper/document';
import { DataMapperModal } from '../../DataMapper/DataMapperModal';

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(choiceField.selectedMemberIndex ?? null);

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

  const selectedItem = useMemo(
    () => (selectedIndex === null ? undefined : items[selectedIndex]),
    [items, selectedIndex],
  );

  const handleChange = useCallback(
    (item?: TypeaheadItem<number>) => {
      if (item !== undefined && item.value >= 0 && item.value < members.length) {
        setSelectedIndex(item.value);
      }
    },
    [members.length],
  );

  const handleSave = useCallback(() => {
    if (selectedIndex !== null) {
      onSelect(selectedIndex);
      onClose();
    }
  }, [selectedIndex, onSelect, onClose]);

  return (
    <DataMapperModal variant={ModalVariant.small} isOpen={isOpen} onClose={onClose} appendTo={() => document.body}>
      <ModalHeader title={`Choice: ${fieldName}`} />
      <ModalBody>
        <Typeahead
          id="choice-member-select"
          data-testid="choice-member-select"
          placeholder="Select a member..."
          items={items}
          selectedItem={selectedItem}
          onChange={handleChange}
        />
      </ModalBody>
      <ModalFooter>
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button key="save" variant="primary" onClick={handleSave} isDisabled={selectedIndex === null}>
          Save
        </Button>
      </ModalFooter>
    </DataMapperModal>
  );
};
