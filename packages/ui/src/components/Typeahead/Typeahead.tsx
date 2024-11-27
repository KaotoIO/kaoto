import {
  Button,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  SelectOptionProps,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from 'react';
import { IDataTestID } from '../../models';

export interface TypeaheadOptions extends IDataTestID {
  value: string;
  description?: string;
  className?: string;
  isDisabled?: boolean;
  isSelected?: boolean;
}

interface TypeaheadProps extends IDataTestID {
  value?: string;
  options: Array<TypeaheadOptions>;
  onChange?: (value: string) => void;
  canCreateNewOption?: boolean;
}

export const Typeahead: FunctionComponent<TypeaheadProps> = ({
  value,
  options = [],
  onChange,
  canCreateNewOption = false,
  'data-testid': dataTestId = 'typeahead',
}) => {
  const selectedReference = value ?? '';

  const listOptions: TypeaheadOptions[] = useMemo(() => {
    const localOptions: TypeaheadOptions[] = [];
    const hasSelectedReference = options.some((option) => option.value === selectedReference);

    if (!hasSelectedReference && selectedReference !== '') {
      const newOption: TypeaheadOptions = {
        value: selectedReference,
        isSelected: true,
      };
      localOptions.push(newOption);
    }

    return localOptions.concat(options);
  }, [options, selectedReference]);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>(selectedReference);
  const [filterValue, setFilterValue] = useState<string>('');
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>(listOptions);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [onCreation, setOnCreation] = useState<boolean>(false); // Boolean to refresh filter state after new option is created
  const textInputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    let newSelectOptions: SelectOptionProps[] = [...listOptions];
    const lowerCaseFilterValue = filterValue.toLowerCase();

    // Filter menu items based on the text input value when one exists
    if (filterValue) {
      newSelectOptions = listOptions.filter(
        (menuItem) =>
          menuItem.value.toLocaleLowerCase().includes(lowerCaseFilterValue) ||
          menuItem.description?.toLocaleLowerCase().includes(lowerCaseFilterValue),
      );

      // When no options are found after filtering, display creation option
      if (canCreateNewOption && !newSelectOptions.length) {
        newSelectOptions = [{ isDisabled: false, children: `Insert custom value "${filterValue}"`, value: 'create' }];
      }

      // Open the menu when the input value changes and the new value is not empty
      if (!isOpen) {
        setIsOpen(true);
      }
    }
    setSelectOptions(newSelectOptions);
    setActiveItem(null);
    setFocusedItemIndex(null);
  }, [canCreateNewOption, filterValue, isOpen, listOptions]);

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (_event: unknown, value: string | number | undefined) => {
    // if (value === 'create') {
    //   if (!listOptions.some((item) => item.value === filterValue)) {
    //     listOptions = [...listOptions, { value: filterValue }];
    //   }
    //   setSelected(filterValue);
    //   setOnCreation(!onCreation);
    //   onChange?.(filterValue);
    //   setFilterValue('');
    // } else {
    setInputValue(value as string);
    setFilterValue('');
    setSelected(value as string);
    onChange?.(value as string);
    // }
    setIsOpen(false);
    setFocusedItemIndex(null);
    setActiveItem(null);
  };

  const onTextInputChange = (_event: unknown, value: string) => {
    setInputValue(value);
    setFilterValue(value);
  };
  const handleMenuArrowKeys = (key: string) => {
    let indexToFocus;

    if (isOpen) {
      if (key === 'ArrowUp') {
        // When no index is set or at the first index, focus to the last, otherwise decrement focus index
        if (focusedItemIndex === null || focusedItemIndex === 0) {
          indexToFocus = selectOptions.length - 1;
        } else {
          indexToFocus = focusedItemIndex - 1;
        }
      }

      if (key === 'ArrowDown') {
        // When no index is set or at the last index, focus to the first, otherwise increment focus index
        if (focusedItemIndex === null || focusedItemIndex === selectOptions.length - 1) {
          indexToFocus = 0;
        } else {
          indexToFocus = focusedItemIndex + 1;
        }
      }

      setFocusedItemIndex(indexToFocus ?? null);
      const focusedItem = selectOptions.filter((option) => !option.isDisabled)[indexToFocus!];
      setActiveItem(`select-create-typeahead-${focusedItem.value.replace(' ', '-')}`);
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const enabledMenuItems = selectOptions.filter((option) => !option.isDisabled);
    const [firstMenuItem] = enabledMenuItems;
    const focusedItem = focusedItemIndex ? enabledMenuItems[focusedItemIndex] : firstMenuItem;

    switch (event.key) {
      // Select the first available option
      case 'Enter':
        if (isOpen) {
          onSelect(undefined, focusedItem.value as string);
          setIsOpen((prevIsOpen) => !prevIsOpen);
          setFocusedItemIndex(null);
          setActiveItem(null);
        }

        setIsOpen((prevIsOpen) => !prevIsOpen);
        setFocusedItemIndex(null);
        setActiveItem(null);

        break;
      case 'Tab':
      case 'Escape':
        setIsOpen(false);
        setActiveItem(null);
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        handleMenuArrowKeys(event.key);
        break;
    }
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle ref={toggleRef} variant="typeahead" onClick={onToggleClick} isExpanded={isOpen} isFullWidth>
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id={`${dataTestId}-input`}
          data-testid={`${dataTestId}-input`}
          innerRef={textInputRef}
          isExpanded={isOpen}
          autoComplete="off"
          placeholder="Type or select an option"
          {...(activeItem && { 'aria-activedescendant': activeItem })}
          role="combobox"
          aria-controls="select-create-typeahead-listbox"
        />

        <TextInputGroupUtilities>
          {!!inputValue && (
            <Button
              variant="plain"
              onClick={() => {
                setSelected('');
                setInputValue('');
                setFilterValue('');
                onChange?.('');
                textInputRef?.current?.focus();
              }}
              aria-label="Clear input value"
            >
              <TimesIcon aria-hidden />
            </Button>
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Select
      data-testdid={`${dataTestId}-select`}
      isOpen={isOpen}
      selected={selected}
      onSelect={onSelect}
      onOpenChange={() => {
        setIsOpen(false);
      }}
      toggle={toggle}
    >
      <SelectList id="select-create-typeahead-listbox">
        {selectOptions.map((option, index) => (
          <SelectOption
            key={option.value}
            itemId={option.value}
            data-testid={`select-typeahead-${option.value}`}
            description={option.description}
            isFocused={focusedItemIndex === index}
            className={option.className}
            onClick={() => setSelected(option.value)}
          >
            {option.value}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
