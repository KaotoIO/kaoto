import { ComboBox } from '@carbon/react';
import type { OnChangeData as ComboOnChangeData } from '@carbon/react/lib/components/ComboBox/ComboBox';
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isDefined } from '../utils';
import { TypeaheadProps } from './Typeahead.types';

export const CREATE_NEW_ITEM = 'create-new-with-name';

export const Typeahead: FunctionComponent<TypeaheadProps> = ({
  selectedItem,
  items: itemsProps,
  id,
  placeholder = 'Select or write an option',
  onInputValueChange,
  onChange,
  onCleanInput,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  onCreate,
  onCreatePrefix,
  disabled = false,
  allowCustomInput = false,
}) => {
  const [inputValue, setInputValue] = useState<string>(selectedItem?.name ?? '');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const customInputHandledRef = useRef<boolean>(false);
  const inputValueRef = useRef<string>(inputValue);

  const items = useMemo(() => {
    const isValueInArray = isDefined(itemsProps.find((item) => item.name === selectedItem?.name));
    const localArray = itemsProps.slice();
    if (isValueInArray) {
      return localArray;
    }
    if (selectedItem?.name && selectedItem?.value) {
      localArray.unshift({ name: selectedItem.name, value: selectedItem.value });
    }

    return localArray;
  }, [itemsProps, selectedItem?.name, selectedItem?.value]);

  useEffect(() => {
    const nextValue = selectedItem?.name ?? '';
    setInputValue(nextValue);
    inputValueRef.current = nextValue;
  }, [selectedItem]);

  useEffect(() => {
    if (!allowCustomInput || !wrapperRef.current) return;

    const input = wrapperRef.current.querySelector('input[role="combobox"]') as HTMLInputElement;
    if (!input) return;

    const handleKeyDown = (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      const currentValue = inputValueRef.current;
      if (keyboardEvent.key === 'Enter' && currentValue.trim()) {
        // Check if the dropdown menu is open (has highlighted item)
        const menu = wrapperRef.current?.querySelector('[role="listbox"]');
        const highlightedItem = menu?.querySelector(
          '[data-highlighted="true"], .cds--list-box__menu-item--highlighted',
        );

        // If there's a highlighted item in the dropdown, let ComboBox handle it
        if (highlightedItem) {
          return;
        }

        const isExistingItem = items.some((item) => item.name === currentValue);
        const isCreateNew = currentValue.includes('Create new');
        if (!isExistingItem && !isCreateNew) {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          customInputHandledRef.current = true;
          const customItem = { name: currentValue, value: currentValue, description: '' };
          onChange?.(customItem);
        }
      }
    };

    const handleBlur = () => {
      const currentValue = inputValueRef.current;
      if (currentValue.trim()) {
        const isExistingItem = items.some((item) => item.name === currentValue);
        const isCreateNew = currentValue.includes('Create new');
        if (!isExistingItem && !isCreateNew) {
          customInputHandledRef.current = true;
          const customItem = { name: currentValue, value: currentValue, description: '' };
          onChange?.(customItem);
        }
      }
    };

    input.addEventListener('keydown', handleKeyDown, { capture: true });
    input.addEventListener('blur', handleBlur);

    return () => {
      input.removeEventListener('keydown', handleKeyDown, { capture: true });
      input.removeEventListener('blur', handleBlur);
    };
  }, [allowCustomInput, inputValue, items, selectedItem, onChange]);

  const handleChange = useCallback(
    (data: ComboOnChangeData<{ id: string; text: string }>) => {
      const selected = data.selectedItem ?? null;

      if (customInputHandledRef.current) {
        customInputHandledRef.current = false;
        return;
      }

      if (!selected) {
        if (allowCustomInput) {
          if (!inputValue || !inputValue.trim()) {
            setInputValue('');
            return;
          }
          onCleanInput?.();
          return;
        }
        onChange?.(undefined);
        setInputValue('');
        onCleanInput?.();
        return;
      }

      if (selected.id === CREATE_NEW_ITEM) {
        onCreate?.(selected.id, inputValue);
        return;
      }

      const selectedFromItems = items.find((item) => String(item.value) === selected.id && item.name === selected.text);

      if (selectedFromItems) {
        setInputValue(selectedFromItems.name);
        onChange?.(selectedFromItems);
        return;
      }

      const selectedById = items.find((item) => String(item.value) === selected.id);
      if (selectedById) {
        setInputValue(selectedById.name);
        onChange?.(selectedById);
        return;
      }

      if (allowCustomInput && selected.text && selected.text.trim()) {
        const customItem = { name: selected.text, value: selected.text, description: '' };
        onChange?.(customItem);
      }
    },
    [onChange, items, onCreate, inputValue, allowCustomInput, onCleanInput],
  );

  const handleInputChange = useCallback(
    (inputValue: string) => {
      setInputValue(inputValue);
      inputValueRef.current = inputValue;
      onInputValueChange?.(inputValue);
    },
    [onInputValueChange],
  );

  const comboBoxItems = useMemo(() => {
    const mappedItems = items.map((item) => ({
      id: String(item.value),
      text: item.name,
      description: item.description,
    }));

    if (onCreate && inputValue && inputValue.trim()) {
      const createNewText = onCreatePrefix
        ? `Create new ${onCreatePrefix} '${inputValue}'`
        : `Create new ${onCreatePrefix ?? ''}`;

      const createNewItem = {
        id: CREATE_NEW_ITEM,
        text: createNewText.trim(),
        description: '',
      };
      mappedItems.push(createNewItem);
    }

    return mappedItems;
  }, [items, onCreate, onCreatePrefix, inputValue]);

  const selectedComboBoxItem = useMemo(() => {
    return selectedItem
      ? { id: String(selectedItem.value), text: selectedItem.name, description: selectedItem.description }
      : null;
  }, [selectedItem]);

  return (
    <div ref={wrapperRef}>
      <ComboBox
        id={id ?? `typeahead-${dataTestId}`}
        titleText=""
        placeholder={placeholder}
        items={comboBoxItems}
        itemToString={(item) => (item ? item.text : '')}
        selectedItem={selectedComboBoxItem}
        onChange={handleChange}
        onInputChange={handleInputChange}
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={dataTestId}
        allowCustomValue={allowCustomInput}
        shouldFilterItem={(menu) => {
          if (menu?.item?.id === CREATE_NEW_ITEM) {
            return true;
          }
          // If no input value, show all items
          if (!inputValue) return true;

          // If input value matches the selected item exactly, show all items
          if (selectedItem && inputValue === selectedItem.name) {
            return true;
          }

          // Otherwise, filter based on input
          return menu?.item?.text?.toLowerCase().includes(inputValue.toLowerCase()) ?? false;
        }}
      />
    </div>
  );
};
