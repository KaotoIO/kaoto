import {
  Button,
  Divider,
  InputGroup,
  InputGroupItem,
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
  Tooltip,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useEffect, useMemo, useRef, useState } from 'react';
import { XPathParserService } from '../../../services/xpath/xpath-parser.service';
import { FunctionGroup } from '../../../services/xpath/xpath-parser';
import { IFunctionDefinition } from '../../../models';

type FunctionOptionProps = SelectOptionProps & {
  functionGroup: string;
  displayName: string;
  descriptionString: string;
  functionDefinition: IFunctionDefinition;
};
const functionDefinitions = XPathParserService.getXPathFunctionDefinitions();
const allFunctionOptions = Object.keys(functionDefinitions).reduce((acc, value) => {
  return functionDefinitions[value as FunctionGroup].reduce((acc2, func) => {
    acc2.push({
      value: func.name,
      children: func.displayName,
      displayName: func.displayName,
      description: func.description,
      descriptionString: func.description,
      functionGroup: value,
      functionDefinition: func,
    });
    return acc2;
  }, acc);
}, [] as FunctionOptionProps[]);

type FunctionSelectorProps = {
  onSelect: (selected: IFunctionDefinition) => void;
};
export const FunctionSelector: FunctionComponent<FunctionSelectorProps> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [functionOptions, setFunctionOptions] = useState<FunctionOptionProps[]>(allFunctionOptions);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const textInputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    let newFunctionOptions = allFunctionOptions;
    if (filterValue) {
      newFunctionOptions = allFunctionOptions.filter((option) => {
        return (
          option.functionGroup.includes(filterValue) ||
          option.value.includes(filterValue) ||
          option.displayName.includes(filterValue) ||
          option.descriptionString.includes(filterValue)
        );
      });

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

  const handleOnSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (value && value !== 'no results') {
      setInputValue(value as string);
      setFilterValue('');
      setSelected(value as string);
      onSelect(functionOptions.find((op) => op.value === value)!.functionDefinition);
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
          placeholder="Select function"
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

  type FunctionOptionsGroupProps = {
    group: string;
    indexes: number[];
  };

  const FunctionOptionsGroup: FunctionComponent<FunctionOptionsGroupProps> = ({ group, indexes }) => {
    return (
      <>
        <SelectGroup label={group}>
          <SelectList>
            {indexes.map((index) => {
              const option = functionOptions[index];
              return (
                <SelectOption
                  key={option.value}
                  isFocused={focusedItemIndex === index}
                  className={option.className}
                  onClick={() => setSelected(option.value)}
                  id={`select-typeahead-${option.value}`}
                  value={option.value}
                  ref={null}
                  description={option.description}
                >
                  {option.displayName}
                </SelectOption>
              );
            })}
          </SelectList>
        </SelectGroup>
        <Divider />
      </>
    );
  };

  const groupedOptionIndexes = useMemo(
    () =>
      functionOptions.reduce(
        (acc, option) => {
          if (!acc[option.functionGroup]) {
            acc[option.functionGroup] = [];
          }
          acc[option.functionGroup].push(functionOptions.indexOf(option));
          return acc;
        },
        {} as Record<string, number[]>,
      ),
    [functionOptions],
  );

  const GroupedFunctionOptions: FunctionComponent = () => {
    return Object.keys(groupedOptionIndexes).map((group, index) => {
      if (groupedOptionIndexes[group].length == 0) return undefined;
      return index === 0 ? (
        <FunctionOptionsGroup group={group} indexes={groupedOptionIndexes[group]} />
      ) : (
        <>
          <Divider />
          <FunctionOptionsGroup group={group} indexes={groupedOptionIndexes[group]} />
        </>
      );
    });
  };

  return (
    <InputGroup>
      <InputGroupItem>
        <Select
          id="typeahead-select"
          isOpen={isOpen}
          selected={selected}
          onSelect={handleOnSelect}
          onOpenChange={() => {
            setIsOpen(false);
          }}
          toggle={toggle}
          isScrollable
          popperProps={{ preventOverflow: true }}
        >
          <GroupedFunctionOptions />
        </Select>
      </InputGroupItem>
      <InputGroupItem>
        <Tooltip content={'Apply function'}>
          <Button
            isDisabled={!selected}
            variant="control"
            aria-label="Apply Function"
            data-testid={`apply-function-button`}
            onClick={() => {}}
          >
            Apply
          </Button>
        </Tooltip>
      </InputGroupItem>
    </InputGroup>
  );
};
