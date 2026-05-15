import './TypeaheadInput.scss';

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
import { FunctionComponent, Ref, useCallback, useMemo, useRef, useState } from 'react';

export interface TypeaheadInputOption {
  value: string;
  description: string;
}

interface TypeaheadInputProps {
  value: string;
  onChange: (value: string) => void;
  options: TypeaheadInputOption[];
  id?: string;
  'data-testid'?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/**
 * Text input with typeahead candidate suggestions.
 * Shows filtered candidates as the user types, and fills the selected
 * candidate value into the input.
 */
export const TypeaheadInput: FunctionComponent<TypeaheadInputProps> = ({
  value: inputValue,
  onChange,
  options,
  id,
  'data-testid': dataTestId,
  placeholder = 'Type to search',
  className,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;
    const lower = inputValue.toLowerCase();
    return options.filter(
      (opt) => opt.value.toLowerCase().includes(lower) || opt.description.toLowerCase().includes(lower),
    );
  }, [options, inputValue]);

  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, value: string) => {
      inputValueRef.current = value;
      onChange(value);
      const lower = value.toLowerCase();
      const hasMatches =
        (value === '' && options.length > 0) ||
        options.some((opt) => opt.value.toLowerCase().includes(lower) || opt.description.toLowerCase().includes(lower));
      setIsOpen(hasMatches);
    },
    [onChange, options],
  );

  const handleSelect = useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      if (typeof value !== 'string') return;
      inputValueRef.current = value;
      onChange(value);
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [onChange],
  );

  const handleFocus = useCallback(() => {
    if (!inputValueRef.current && options.length > 0) {
      setIsOpen(true);
    }
  }, [options.length]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (e.relatedTarget?.closest?.('[role="listbox"]')) return;
    setIsOpen(false);
  }, []);

  const handleClear = useCallback(() => {
    inputValueRef.current = '';
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle ref={toggleRef} variant="typeahead" isExpanded={isOpen} isFullWidth className={className}>
        <TextInputGroup isPlain>
          <TextInputGroupMain
            autoComplete="off"
            id={id}
            data-testid={dataTestId}
            ref={inputRef}
            placeholder={placeholder}
            aria-label={ariaLabel}
            value={inputValue}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleInputChange}
          />
          {inputValue && (
            <TextInputGroupUtilities>
              <Button variant="plain" onClick={handleClear} aria-label="Clear expression" icon={<TimesIcon />} />
            </TextInputGroupUtilities>
          )}
        </TextInputGroup>
      </MenuToggle>
    ),
    [
      ariaLabel,
      className,
      dataTestId,
      handleBlur,
      handleClear,
      handleFocus,
      handleInputChange,
      id,
      inputValue,
      isOpen,
      placeholder,
    ],
  );

  return (
    <Select
      className="typeahead-input"
      id={id ? `${id}-select` : undefined}
      isOpen={isOpen}
      selected={inputValue}
      onSelect={handleSelect}
      onOpenChange={setIsOpen}
      toggle={toggle}
    >
      <SelectList>
        {filteredOptions.map((opt, idx) => (
          <SelectOption key={`${opt.value}-${idx}`} value={opt.value} description={opt.description}>
            {opt.value}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
