import {
  Button,
  MenuToggle,
  MenuToggleElement,
  PopperOptions,
  Select,
  SelectList,
  SelectOption,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, Ref, useCallback, useMemo, useRef, useState } from 'react';

export interface TypeaheadSelectOption {
  value: string;
  label?: string;
  description?: string;
}

interface TypeaheadSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: TypeaheadSelectOption[];
  id?: string;
  'data-testid'?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  popperProps?: PopperOptions;
}

/**
 * Typeahead select that requires picking from the list.
 * Typing filters the candidates but does not change the value.
 * Only clicking an option fires onChange.
 */
export const TypeaheadSelect: FunctionComponent<TypeaheadSelectProps> = ({
  value: selectedValue,
  onChange,
  options,
  id,
  'data-testid': dataTestId,
  placeholder,
  ariaLabel,
  className,
  popperProps,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = useMemo(() => {
    const found = options.find((opt) => opt.value === selectedValue);
    return found ? (found.label ?? found.value) : '';
  }, [selectedValue, options]);

  const displayedValue = isOpen ? filterText : selectedLabel;

  const filteredOptions = useMemo(() => {
    if (!filterText) return options;
    const lower = filterText.toLowerCase();
    return options.filter(
      (opt) => (opt.label ?? opt.value).toLowerCase().includes(lower) || opt.description?.toLowerCase().includes(lower),
    );
  }, [options, filterText]);

  const handleInputChange = useCallback(
    (_event: React.SyntheticEvent, value: string) => {
      setFilterText(value);
      if (!isOpen) setIsOpen(true);
    },
    [isOpen],
  );

  const handleSelect = useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      if (typeof value !== 'string') return;
      setFilterText('');
      onChange(value);
      setIsOpen(false);
    },
    [onChange],
  );

  const handleFocus = useCallback(() => {
    if (options.length > 0) {
      setFilterText('');
      setIsOpen(true);
    }
  }, [options.length]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (e.relatedTarget?.closest?.('[role="listbox"]')) return;
    setIsOpen(false);
    setFilterText('');
  }, []);

  const handleClear = useCallback(() => {
    setFilterText('');
    inputRef.current?.focus();
  }, []);

  const handleToggleClick = () => {
    if (isOpen) {
      setIsOpen(false);
      setFilterText('');
    } else {
      setFilterText('');
      setIsOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      variant="typeahead"
      isExpanded={isOpen}
      isFullWidth
      className={className}
      onClick={handleToggleClick}
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          autoComplete="off"
          id={id}
          data-testid={dataTestId}
          ref={inputRef}
          placeholder={placeholder}
          aria-label={ariaLabel}
          value={displayedValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleInputChange}
        />
        {displayedValue && (
          <TextInputGroupUtilities>
            <Button variant="plain" onClick={handleClear} aria-label="Clear expression" icon={<TimesIcon />} />
          </TextInputGroupUtilities>
        )}
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Select
      id={id ? `${id}-select` : undefined}
      data-testid={dataTestId ? `${dataTestId}-select` : undefined}
      isOpen={isOpen}
      selected={selectedValue}
      onSelect={handleSelect}
      onOpenChange={setIsOpen}
      toggle={toggle}
      maxMenuHeight="240px"
      popperProps={{ preventOverflow: true, ...popperProps }}
    >
      <SelectList>
        {filteredOptions.map((opt, idx) => (
          <SelectOption key={`${opt.value}-${idx}`} value={opt.value} description={opt.description}>
            {opt.label ?? opt.value}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};
