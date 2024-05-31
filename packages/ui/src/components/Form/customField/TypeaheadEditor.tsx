import React from 'react';
import {
  Select,
  SelectOption,
  SelectList,
  SelectOptionProps,
  MenuToggle,
  MenuToggleElement,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
} from '@patternfly/react-core';
import { FunctionComponent, Ref, useCallback, useEffect, useRef, useState } from 'react';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import { SchemaService } from '../schema.service';
import { MetadataEditor } from '../../MetadataEditor';
import { JSONSchema4 } from 'json-schema';

interface TypeaheadEditorProps {
  selectOptions: SelectOptionProps[];
  title: string;
  selected: { name: string; title: string } | undefined;
  selectedSchema: JSONSchema4 | undefined;
  selectedModel: Record<string, unknown> | undefined;
  selectionOnChange: (
    selectedItem: { name: string; title: string } | undefined,
    newItemModel: Record<string, unknown>,
  ) => void;
}

export const TypeaheadEditor: FunctionComponent<TypeaheadEditorProps> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>(props.selected?.name || '');
  const [inputValue, setInputValue] = useState<string>(props.selected?.title || '');
  const [filterValue, setFilterValue] = useState<string>('');
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>(props.selectOptions);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    props.selected ? setSelected(props.selected.name) : setSelected('');
  }, [props.selected]);

  useEffect(() => {
    let newSelectOptions: SelectOptionProps[] = props.selectOptions;

    // Filter menu items based on the text input value when one exists
    if (filterValue) {
      const lowerFilterValue = filterValue.toLowerCase();
      newSelectOptions = props.selectOptions.filter((menuItem) => {
        return (
          String(menuItem.value).toLowerCase().includes(lowerFilterValue) ||
          String(menuItem.children).toLowerCase().includes(lowerFilterValue) ||
          String(menuItem.description).toLowerCase().includes(lowerFilterValue)
        );
      });
      // When no options are found after filtering, display 'No results found'
      if (!newSelectOptions.length) {
        newSelectOptions = [
          { isDisabled: false, children: `No results found for "${filterValue}"`, value: 'no results' },
        ];
      }
      // Open the menu when the input value changes and the new value is not empty
      if (!isOpen) {
        setIsOpen(true);
      }
    }

    setSelectOptions(newSelectOptions);
    setActiveItem(null);
    setFocusedItemIndex(null);
  }, [filterValue, props.selectOptions, isOpen]);

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const onSelect = useCallback(
    (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
      const option = selectOptions.find((option) => option.children === value);
      if (option && value !== 'no results') {
        setInputValue(value as string);
        setFilterValue('');
        props.selectionOnChange({ name: option!.value as string, title: option!.children as string }, {});
        setSelected(option!.children as string);
      }
      setIsOpen(false);
      setFocusedItemIndex(null);
      setActiveItem(null);
    },
    [selectOptions, props.selectionOnChange],
  );

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

      setFocusedItemIndex(indexToFocus!);
      const focusedItem = selectOptions.filter((option) => !option.isDisabled)[indexToFocus!];
      setActiveItem(`select-typeahead-${focusedItem.value.replace(' ', '-')}`);
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const enabledMenuItems = selectOptions.filter((option) => !option.isDisabled);
    const [firstMenuItem] = enabledMenuItems;
    const focusedItem = focusedItemIndex ? enabledMenuItems[focusedItemIndex] : firstMenuItem;

    switch (event.key) {
      // Select the first available option
      case 'Enter':
        if (isOpen && focusedItem.value !== 'no results') {
          setInputValue(String(focusedItem.children));
          setFilterValue('');
          setSelected(String(focusedItem.children));
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

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      variant="typeahead"
      aria-label="Typeahead menu toggle"
      onClick={onToggleClick}
      isExpanded={isOpen}
      isFullWidth
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          data-testid="typeahead-select-input"
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id="typeahead-select-input"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={SchemaService.DROPDOWN_PLACEHOLDER}
          {...(activeItem && { 'aria-activedescendant': activeItem })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-typeahead-listbox"
        />

        <TextInputGroupUtilities>
          {!!inputValue && (
            <Button
              data-testid="clear-input-value"
              variant="plain"
              onClick={() => {
                setSelected('');
                setInputValue('');
                setFilterValue('');
                props.selectionOnChange(undefined, {});
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
    props.selectOptions && (
      <>
        <Select
          id="typeahead-select"
          isOpen={isOpen}
          selected={selected}
          onSelect={onSelect}
          onOpenChange={() => {
            setIsOpen(false);
          }}
          toggle={toggle}
        >
          <SelectList id="select-typeahead-listbox">
            {selectOptions.map((option, index) => (
              <SelectOption
                key={option.value as string}
                description={option.description}
                isFocused={focusedItemIndex === index}
                className={option.className}
                data-testid={`${props.title}-dropdownitem-${option.value}`}
                onClick={() => setSelected(option.children as string)}
                id={`select-typeahead-${option.value.replace(' ', '-')}`}
                {...option}
                value={option.children}
              />
            ))}
          </SelectList>
        </Select>
        {props.selected && (
          <MetadataEditor
            key={props.selected!.name}
            data-testid={`${props.title}-editor`}
            name={`${props.title}`}
            schema={props.selectedSchema}
            metadata={props.selectedModel}
            onChangeModel={(model) =>
              props.selectionOnChange({ name: props.selected!.name, title: props.selected!.title }, model)
            }
          />
        )}
      </>
    )
  );
};
