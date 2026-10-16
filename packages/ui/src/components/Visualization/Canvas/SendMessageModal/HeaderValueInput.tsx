import { Select, SelectItem, TextInput } from '@carbon/react';
import { FunctionComponent } from 'react';

import { getHeaderValueType } from './header-value';

interface HeaderValueInputProps {
  id: string;
  value: string;
  javaType?: string;
  error?: string;
  onChange: (value: string) => void;
}

export const HeaderValueInput: FunctionComponent<HeaderValueInputProps> = ({
  id,
  value,
  javaType,
  error,
  onChange,
}) => {
  const props = {
    id: `header-value-${id}`,
    labelText: 'Header value',
    hideLabel: true,
    value,
    invalid: !!error,
    invalidText: error,
    'data-testid': `header-value-input-${id}`,
  };

  if (getHeaderValueType(javaType) === 'boolean') {
    return (
      <Select
        {...props}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <SelectItem value="" text="Choose true or false" disabled />
        {value && value !== 'true' && value !== 'false' && <SelectItem value={value} text={value} disabled />}
        <SelectItem value="true" text="true" />
        <SelectItem value="false" text="false" />
      </Select>
    );
  }

  return (
    <TextInput
      {...props}
      placeholder="Header value"
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
};
