import './ArrayBadgesField.scss';

import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { Button, Flex, FlexItem, Label, LabelGroup, TextInput } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

interface ArrayBadgesFieldProps extends FieldProps {
  placeholder?: string;
}

/**
 * ArrayBadgesField component for handling arrays of strings with a badge-based UI.
 *
 * Features:
 * - Add new items via text input
 * - Display items as removable badges (PatternFly Labels)
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
      <Flex gap={{ default: 'gapMd' }} direction={{ default: 'column' }}>
        <FlexItem>
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem grow={{ default: 'grow' }}>
              <TextInput
                id={`${propName}-input`}
                value={inputValue}
                onChange={(_event, value) => setInputValue(value)}
                placeholder={placeholder}
                isDisabled={disabled}
                aria-label={schema.title ?? propName}
              />
            </FlexItem>
            <FlexItem>
              <Button variant="primary" onClick={addItem} isDisabled={disabled || inputValue.trim().length === 0}>
                Add
              </Button>
            </FlexItem>
          </Flex>
        </FlexItem>

        <FlexItem>
          {sortedItems.length === 0 ? (
            <span>No items added.</span>
          ) : (
            <div className="array-badges-field">
              <LabelGroup>
                {sortedItems.map((item) => (
                  <Label key={item} onClose={() => removeItem(item)} color="blue" isDisabled={disabled}>
                    {item}
                  </Label>
                ))}
              </LabelGroup>
            </div>
          )}
        </FlexItem>

        <FlexItem>
          <Button variant="link" isInline onClick={clearAll} isDisabled={disabled || sortedItems.length === 0}>
            Clear all
          </Button>
        </FlexItem>
      </Flex>
    </FieldWrapper>
  );
};
