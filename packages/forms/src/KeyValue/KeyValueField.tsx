import { TextInput } from '@carbon/react';
import { forwardRef, useImperativeHandle, useRef, ChangeEvent } from 'react';
import { IDataTestID } from '../models';
import { useSuggestions } from '../hooks/suggestions';
import { JSONSchema4 } from 'json-schema';

interface KeyValueFieldProps extends IDataTestID {
  id: string;
  name: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

const STRING_SCHEMA: JSONSchema4 = { type: 'string' };

export const KeyValueField = forwardRef<HTMLInputElement, KeyValueFieldProps>(
  ({ id, name, placeholder, value, 'data-testid': dataTestId, onChange, onFocus, onBlur }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const { suggestionsMenu } = useSuggestions({
      propName: name,
      schema: STRING_SCHEMA,
      inputRef,
      value: value ?? '',
      setValue: onChange,
    });

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      onChange?.(event.target.value);
    };

    return (
      <div>
        <TextInput
          labelText=""
          type="text"
          id={id}
          name={name}
          data-testid={dataTestId}
          onChange={handleChange}
          ref={inputRef}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          value={value}
        />
        {suggestionsMenu}
      </div>
    );
  },
);
