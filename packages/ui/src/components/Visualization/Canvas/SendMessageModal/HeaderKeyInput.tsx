import { Popover, PopoverContent, TextInput } from '@carbon/react';
import { ChangeEvent, FunctionComponent, KeyboardEvent, useCallback, useMemo, useState } from 'react';

import { ICamelHeaderItem } from './useCamelHeaders';

export interface HeaderKeyInputProps {
  id: string;
  value: string;
  placeholder?: string;
  headersCatalog: ICamelHeaderItem[];
  onChange: (value: string, selectedHeader?: ICamelHeaderItem) => void;
  'data-testid'?: string;
}

export const HeaderKeyInput: FunctionComponent<HeaderKeyInputProps> = ({
  id,
  value,
  placeholder = 'Header key',
  headersCatalog,
  onChange,
  'data-testid': dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Filter headers based on user typing
  const filteredHeaders = useMemo(() => {
    if (!value.trim()) {
      return headersCatalog.slice(0, 50); // Show top 50 by default when empty
    }
    const search = value.toLowerCase().trim();
    return headersCatalog
      .filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.displayName?.toLowerCase().includes(search) ||
          h.description?.toLowerCase().includes(search),
      )
      .slice(0, 50);
  }, [headersCatalog, value]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val);
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [onChange],
  );

  const handleSelectHeader = useCallback(
    (header: ICamelHeaderItem) => {
      onChange(header.name, header);
      setIsOpen(false);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        setIsOpen(true);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredHeaders.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredHeaders.length) {
          e.preventDefault();
          handleSelectHeader(filteredHeaders[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [filteredHeaders, handleSelectHeader, highlightedIndex, isOpen],
  );

  return (
    <Popover
      as="div"
      className="header-key-input"
      data-testid={dataTestId}
      open={isOpen && filteredHeaders.length > 0}
      align="bottom-start"
      autoAlign
      caret={false}
      onRequestClose={() => {
        setIsOpen(false);
      }}
    >
      <TextInput
        id={id}
        labelText="Header key"
        hideLabel
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        data-testid={`${dataTestId}-textinput`}
      />

      {isOpen && filteredHeaders.length > 0 && (
        <PopoverContent>
          <div className="header-key-input__dropdown" role="listbox" data-testid={`${dataTestId}-dropdown`}>
            {filteredHeaders.map((header, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <div
                  key={header.name}
                  role="option"
                  tabIndex={-1}
                  aria-selected={isHighlighted}
                  className={`header-key-input__item ${isHighlighted ? 'header-key-input__item--highlighted' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur before click registers
                    handleSelectHeader(header);
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(idx);
                  }}
                  data-testid={`${dataTestId}-item-${header.name}`}
                >
                  <span className="header-key-input__item-name">{header.name}</span>
                  {header.description && (
                    <div className="header-key-input__item-desc" title={header.description}>
                      {header.description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};
