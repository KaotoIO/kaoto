import { wrapField } from '@kaoto-next/uniforms-patternfly';
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
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HTMLFieldProps, connectField } from 'uniforms';

export type SelectOptionObject = {
  value: string | number;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypeaheadProps = HTMLFieldProps<any, HTMLDivElement> & {
  options?: Array<SelectOptionObject>;
};

export const TypeaheadField = connectField((props: TypeaheadProps) => {
  const selectedReference = (props.value as string) ?? '';
  let allOptions: SelectOptionProps[] = useMemo(() => {
    const hasSelectedReference = props.options?.some((option) => option.value === selectedReference);
    if (!hasSelectedReference && selectedReference !== '') {
      const newOption: SelectOptionObject = {
        value: selectedReference,
      };
      props.options?.push(newOption);
    }
    return props.options!.map((option) => {
      return {
        value: option.value,
        children: option.value,
        isSelected: option.value === selectedReference,
      };
    });
  }, [selectedReference]);

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>(selectedReference);
  const [filterValue, setFilterValue] = useState<string>('');
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>(allOptions);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [onCreation, setOnCreation] = useState<boolean>(false); // Boolean to refresh filter state after new option is created
  const textInputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    let newSelectOptions: SelectOptionProps[] = [...allOptions];

    // Filter menu items based on the text input value when one exists
    if (filterValue) {
      newSelectOptions = allOptions.filter((menuItem) =>
        String(menuItem.children).toLowerCase().includes(filterValue.toLowerCase()),
      );
      // When no options are found after filtering, display creation option
      if (!newSelectOptions.length) {
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
  }, [filterValue, onCreation, isOpen]);

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
    if (value === 'create') {
      if (!allOptions.some((item) => item.value === filterValue)) {
        allOptions = [...allOptions, { value: filterValue, children: filterValue }];
      }
      setSelected(filterValue);
      setOnCreation(!onCreation);
      props.onChange(filterValue);
      setFilterValue('');
    } else {
      setInputValue(value as string);
      setFilterValue('');
      setSelected(value as string);
      props.onChange(value as string);
    }
    setIsOpen(false);
    setFocusedItemIndex(null);
    setActiveItem(null);
  };

  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
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
          id="create-typeahead-select-input"
          data-testid="create-typeahead-select-input"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder="Select an option"
          {...(activeItem && { 'aria-activedescendant': activeItem })}
          role="combobox"
          isExpanded={isOpen}
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
                props.onChange('');
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

  return wrapField(
    props,
    <Select
      id="create-typeahead-select"
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
            key={option.value as string}
            description={option.description}
            isFocused={focusedItemIndex === index}
            className={option.className}
            onClick={() => setSelected(option.value)}
            id={`select-typeahead-${option.value}`}
            {...option}
            ref={null}
          />
        ))}
      </SelectList>
    </Select>,
  );
});
