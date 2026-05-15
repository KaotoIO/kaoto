import { Typeahead, TypeaheadItem } from '@kaoto/forms';
import { Button, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DataMapperModal } from '../../DataMapper/DataMapperModal';

export interface MemberSelectionModalProps<T> {
  isOpen: boolean;
  title: string;
  placeholder: string;
  testId: string;
  items: TypeaheadItem<T>[];
  selectedValue: T | null;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export function MemberSelectionModal<T>({
  isOpen,
  title,
  placeholder,
  testId,
  items,
  selectedValue,
  onSelect,
  onClose,
}: Readonly<MemberSelectionModalProps<T>>) {
  const [value, setValue] = useState<T | null>(selectedValue);

  useEffect(() => {
    setValue(selectedValue);
  }, [selectedValue, isOpen]);

  const selectedItem = useMemo(
    () => (value === null ? undefined : items.find((item) => item.value === value)),
    [items, value],
  );

  const handleChange = useCallback((item?: TypeaheadItem<T>) => {
    if (item !== undefined) {
      setValue(item.value);
    }
  }, []);

  const handleSave = useCallback(() => {
    if (value !== null) {
      onSelect(value);
      onClose();
    }
  }, [value, onSelect, onClose]);

  return (
    <DataMapperModal variant={ModalVariant.small} isOpen={isOpen} onClose={onClose} appendTo={() => document.body}>
      <ModalHeader title={title} />
      <ModalBody>
        <Typeahead
          id={testId}
          data-testid={testId}
          placeholder={placeholder}
          items={items}
          selectedItem={selectedItem}
          onChange={handleChange}
        />
      </ModalBody>
      <ModalFooter>
        <Button key="cancel" variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button key="save" variant="primary" onClick={handleSave} isDisabled={value === null}>
          Save
        </Button>
      </ModalFooter>
    </DataMapperModal>
  );
}
