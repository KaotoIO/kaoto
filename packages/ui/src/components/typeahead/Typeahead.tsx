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
import { FormEvent, FunctionComponent, MouseEventHandler, Ref, useCallback, useMemo, useRef, useState } from 'react';
import { isDefined } from '../../utils';
import { TypeaheadProps } from './Typeahead.types';

export const Typeahead: FunctionComponent<TypeaheadProps> = ({
  selectedItem,
  items,
  id,
  onChange,
  onCleanInput,
  'data-testid': dataTestId,
}) => {
  const [inputValue, setInputValue] = useState<string>(selectedItem?.name ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onItemChanged = useCallback(
    (_event: unknown, name: string | number | undefined) => {
      if (!isDefined(name)) {
        onChange?.(undefined);
        setInputValue('');
        setIsOpen(false);
        return;
      }

      const localItem = items.find((item) => item.name === name);
      setInputValue(name.toString());
      setIsOpen(false);

      if (name !== selectedItem?.name) {
        onChange?.(localItem);
      }
    },
    [onChange, items, selectedItem?.name],
  );

  const onToggleClick: MouseEventHandler<HTMLDivElement | HTMLButtonElement> = (event) => {
    event.stopPropagation();
    setIsOpen(!isOpen);
  };

  const onTextInputChange = (_event: FormEvent<HTMLInputElement>, value: string) => {
    setInputValue(value);
  };

  const onTextInputClear = () => {
    setInputValue('');
    setIsOpen(true);
    onCleanInput?.();
    inputRef.current?.focus();
  };

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const hasNameMatch = item.name.includes(inputValue);
        const hasDescriptionMatch = item.description?.includes(inputValue);

        return !inputValue || hasNameMatch || hasDescriptionMatch;
      }),
    [inputValue, items],
  );

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      isFullWidth
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isOpen}
      variant="typeahead"
      aria-label="Typeahead select"
      id={id}
      data-testid={dataTestId}
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          autoComplete="off"
          id={`typeahead-select-input-${id}`}
          data-testid={`typeahead-select-input-${dataTestId}`}
          ref={inputRef}
          onClick={onToggleClick}
          value={inputValue}
          onChange={onTextInputChange}
        />

        <TextInputGroupUtilities>
          {!!inputValue && (
            <Button
              variant="plain"
              onClick={onTextInputClear}
              aria-label="Clear input value"
              icon={<TimesIcon aria-hidden />}
            />
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Select
      id={`typeahead-select-${id}`}
      data-testid={`typeahead-select-${dataTestId}`}
      isScrollable
      shouldFocusToggleOnSelect
      isOpen={isOpen}
      selected={selectedItem?.name}
      onSelect={onItemChanged}
      toggle={toggle}
    >
      <SelectList>
        {filteredItems.map((item) => (
          <SelectOption key={item.name} value={item.name} description={item.description}>
            {item.name}
          </SelectOption>
        ))}

        {filteredItems.length === 0 && <SelectOption isDisabled>No items found</SelectOption>}
      </SelectList>
    </Select>
  );
};
