import {
  Button,
  Divider,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectGroup,
  SelectList,
  SelectOption,
  SelectOptionProps,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useEffect, useRef, useState } from 'react';
import { XPathParserService } from '../../services/xpath/xpath-parser.service';
import { FunctionGroup } from '../../services/xpath/xpath-parser';
import { IFunctionDefinition } from '../../models';

const functionCatalog = XPathParserService.getXPathFunctionDefinitions();

export const FunctionSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [functionOptions, setFunctionOptions] = useState<Record<FunctionGroup, IFunctionDefinition[]>>(functionCatalog);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    let newFunctionOptions = functionCatalog;
    if (filterValue) {
      newFunctionOptions = Object.keys(functionCatalog).reduce(
        (acc, groupName) => {
          const group = groupName as FunctionGroup;
          acc[group] = groupName.includes(filterValue)
            ? functionCatalog[group]
            : functionCatalog[group].reduce((acc2, functionDef) => {
                if (
                  functionDef.name.includes(filterValue) ||
                  functionDef.displayName.includes(filterValue) ||
                  functionDef.description.includes(filterValue)
                ) {
                  acc2.push(functionDef);
                }
                return acc2;
              }, [] as IFunctionDefinition[]);
          return acc;
        },
        {} as Record<FunctionGroup, IFunctionDefinition[]>,
      );

      // Open the menu when the input value changes and the new value is not empty
      if (!isOpen) {
        setIsOpen(true);
      }
    }

    setFunctionOptions(newFunctionOptions);
    setActiveItem(null);
    setFocusedItemIndex(null);
  }, [filterValue, isOpen]);

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onSelect = (_event: React.MouseEvent<Element, MouseEvent> | undefined, value: string | number | undefined) => {
    // eslint-disable-next-line no-console
    console.log('selected', value);

    if (value && value !== 'no results') {
      setInputValue(value as string);
      setFilterValue('');
      setSelected(value as string);
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
    let indexToFocus = -1;

    if (isOpen) {
      if (key === 'ArrowUp') {
        // When no index is set or at the first index, focus to the last, otherwise decrement focus index
        if (focusedItemIndex === null || focusedItemIndex === 0) {
          indexToFocus = functionOptions.length - 1;
        } else {
          indexToFocus = focusedItemIndex - 1;
        }
      }

      if (key === 'ArrowDown') {
        // When no index is set or at the last index, focus to the first, otherwise increment focus index
        if (focusedItemIndex === null || focusedItemIndex === functionOptions.length - 1) {
          indexToFocus = 0;
        } else {
          indexToFocus = focusedItemIndex + 1;
        }
      }

      setFocusedItemIndex(indexToFocus);
      const focusedItem = functionOptions.filter((option) => !option.isDisabled)[indexToFocus];
      setActiveItem(`select-typeahead-${focusedItem.value.replace(' ', '-')}`);
    }
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const enabledMenuItems = functionOptions.filter((option) => !option.isDisabled);
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

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
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
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          onKeyDown={onInputKeyDown}
          id="typeahead-select-input"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder="Select a state"
          {...(activeItem && { 'aria-activedescendant': activeItem })}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-typeahead-listbox"
        />

        <TextInputGroupUtilities>
          {!!inputValue && (
            <Button
              variant="plain"
              onClick={() => {
                setSelected('');
                setInputValue('');
                setFilterValue('');
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

  type FunctionSelectGroupProps = {
    group: FunctionGroup;
  };

  const FunctionSelectGroup: FunctionComponent<FunctionSelectGroupProps> = ({ group }) => {
    const functions = functionOptions[group];
    return (
      <>
        <SelectGroup label={group}>
          <SelectList>
            {functions.map((func) => (
              <SelectOption
                key={func.name}
                onClick={() => setSelected(func.name)}
                id={`select-typeahead-${func.name}`}
                value={func.name}
                ref={null}
                description={func.description}
              >
                {func.displayName}
              </SelectOption>
            ))}
          </SelectList>
        </SelectGroup>
        <Divider />
      </>
    );
  };

  return (
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
        {Object.keys(functionOptions).map((groupName) => {
          const group = groupName as FunctionGroup;
          return functionOptions[group].length > 0 && <FunctionSelectGroup group={group} />;
        })}
      </SelectList>
    </Select>
  );
};
