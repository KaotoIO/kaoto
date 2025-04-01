import {
  Button,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import {
  FormEvent,
  FunctionComponent,
  MouseEventHandler,
  Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isDefined } from '../../utils';
import { TypeaheadProps } from './Typeahead.types';

export const CREATE_NEW_ITEM = 'create-new-with-name';

const DEFAULT_POPPER_PROPS = {
  position: 'end',
  preventOverflow: true,
} as const;

export const Typeahead: FunctionComponent<TypeaheadProps> = ({
  selectedItem,
  items: itemsProps,
  id,
  placeholder = 'Select or write an option',
  onChange,
  onCleanInput,
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
  onCreate,
  onCreatePrefix,
  disabled = false,
}) => {
  const [filter, setFilter] = useState<string>(selectedItem?.name ?? '');
  const [inputValue, setInputValue] = useState<string>(selectedItem?.name ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedOptionRef = useRef<HTMLSelectElement>(null);

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
    if (selectedItem?.name) {
      setInputValue(selectedItem.name);
    }
  }, [selectedItem]);

  const onItemChanged = useCallback(
    (_event: unknown, name: string | number | undefined) => {
      if (name === CREATE_NEW_ITEM) {
        onCreate?.(name, inputValue);
        setIsOpen(false);
        return;
      } else if (!isDefined(name)) {
        onChange?.(undefined);
        setInputValue('');
        setIsOpen(false);
        return;
      }

      const localItem = items.find((item) => item.value === name);
      setInputValue(localItem?.name ?? '');
      setIsOpen(false);

      if (name !== selectedItem?.name) {
        onChange?.(localItem);
      }
    },
    [onChange, items, selectedItem?.name, onCreate, inputValue],
  );

  const onToggleClick: MouseEventHandler<HTMLDivElement | HTMLButtonElement> = async (event) => {
    event.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setFilter('');
    setIsOpen(true);

    requestAnimationFrame(() => {
      selectedOptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      inputRef.current?.focus();
    });
  };

  const onInputClick: MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    setFilter(inputValue);
    setIsOpen(true);
  };

  const onTextInputChange = (_event: FormEvent<HTMLInputElement>, value: string) => {
    setFilter(value);
    setInputValue(value);
  };

  const onTextInputClear = () => {
    setFilter('');
    setInputValue('');
    onCleanInput?.();
    inputRef.current?.focus();
  };

  const filteredItems = useMemo(() => {
    const lowerFilterValue = filter.toLowerCase();
    return items.filter((item) => {
      if (!lowerFilterValue) {
        return true;
      }

      const hasNameMatch = item.name?.toLowerCase().includes(lowerFilterValue);
      const hasDescriptionMatch = item.description?.toLowerCase().includes(lowerFilterValue);

      return hasNameMatch || hasDescriptionMatch;
    });
  }, [filter, items]);

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      isFullWidth
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isOpen}
      isDisabled={disabled}
      variant="typeahead"
      aria-label={`${ariaLabel} toggle`}
      id={id}
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          autoComplete="off"
          id={`${id}-typeahead-select-input`}
          aria-label={ariaLabel}
          data-testid={`${dataTestId}-typeahead-select-input`}
          ref={inputRef}
          placeholder={placeholder}
          onClick={onInputClick}
          value={inputValue}
          onChange={onTextInputChange}
        />

        <TextInputGroupUtilities>
          {!!inputValue && (
            <Button
              variant="plain"
              onClick={onTextInputClear}
              aria-label="Clear input value"
              data-testid={`${dataTestId}__clear`}
              icon={<TimesIcon aria-hidden />}
            />
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Select
      id={`${id}-typeahead-select`}
      data-testid={`${dataTestId}-typeahead-select`}
      isScrollable
      shouldFocusToggleOnSelect
      isOpen={isOpen}
      selected={selectedItem?.name}
      onSelect={onItemChanged}
      toggle={toggle}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      popperProps={DEFAULT_POPPER_PROPS}
    >
      <SelectList>
        {filteredItems.map((item) => (
          <SelectOption
            key={item.name}
            value={item.value}
            description={item.description}
            aria-label={`option ${item.name.toLocaleLowerCase()}`}
            isSelected={item.name === selectedItem?.name}
            ref={item.name === selectedItem?.name ? selectedOptionRef : undefined}
          >
            {item.name}
          </SelectOption>
        ))}

        {filteredItems.length === 0 && <SelectOption isDisabled>No items found</SelectOption>}

        {onCreate && (
          <SelectOption value={CREATE_NEW_ITEM} aria-label={`option ${CREATE_NEW_ITEM.toLocaleLowerCase()}`}>
            Create new {onCreatePrefix} {inputValue ? `'${inputValue}'` : ''}
          </SelectOption>
        )}
      </SelectList>
    </Select>
  );
};
