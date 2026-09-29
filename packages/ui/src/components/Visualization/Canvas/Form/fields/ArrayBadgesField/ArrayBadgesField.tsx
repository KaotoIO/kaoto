import './ArrayBadgesField.scss';

import { Button, Tag, TextInput } from '@carbon/react';
import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

interface ArrayBadgesFieldProps extends FieldProps {
  placeholder?: string;
}

/**
 * ArrayBadgesField component for handling arrays of strings with a badge-based UI.
 *
 * Features:
 * - Add new items via text input
 * - Display items as removable badges (Carbon Tags)
 * - Alphabetical sorting
 * - Clear all functionality
 * - Duplicate prevention
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <ArrayBadgesField propName="customMediaTypes" required={false} />
 * ```
 */
export const ArrayBadgesField: FunctionComponent<ArrayBadgesFieldProps> = ({
  propName,
  required,
  placeholder = 'Add new item',
}) => {
  const { schema } = useContext(SchemaContext);
  const { value = [], onChange, disabled } = useFieldValue<string[] | undefined>(propName);
  const [inputValue, setInputValue] = useState<string>('');

  const sortedItems = useMemo(() => [...(value || [])].sort((left, right) => left.localeCompare(right)), [value]);

  const addItem = useCallback(() => {
    const trimmed = inputValue.trim();
    const currentArray = value || [];
    if (!currentArray.includes(trimmed)) {
      onChange([...currentArray, trimmed]);
    }
    setInputValue('');
  }, [inputValue, onChange, value]);

  const removeItem = useCallback(
    (itemToRemove: string) => {
      const currentArray = value || [];
      onChange(currentArray.filter((item) => item !== itemToRemove));
    },
    [onChange, value],
  );

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="array"
      description={schema.description}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <TextInput
              id={`${propName}-input`}
              labelText={schema.title ?? propName}
              hideLabel
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              placeholder={placeholder}
              disabled={disabled}
              aria-label={schema.title ?? propName}
            />
          </div>
          <div>
            <Button kind="primary" onClick={addItem} disabled={disabled || inputValue.trim().length === 0}>
              Add
            </Button>
          </div>
        </div>

        <div>
          {sortedItems.length === 0 ? (
            <span>No items added.</span>
          ) : (
            <div className="array-badges-field" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {sortedItems.map((item) => (
                <Tag
                  key={item}
                  filter
                  onClose={() => {
                    removeItem(item);
                  }}
                  type="blue"
                  disabled={disabled}
                >
                  {item}
                </Tag>
              ))}
            </div>
          )}
        </div>

        <div>
          <Button kind="ghost" size="sm" onClick={clearAll} disabled={disabled || sortedItems.length === 0}>
            Clear all
          </Button>
        </div>
      </div>
    </FieldWrapper>
  );
};
