import './BooleanField.scss';

import { Toggle } from '@carbon/react';
import { FunctionComponent, useContext } from 'react';

import { useFieldValue } from '../hooks/field-value';
import { FieldProps } from '../models/typings';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldWrapper } from './FieldWrapper';

export const BooleanField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value, onChange, disabled } = useFieldValue<boolean>(propName);

  const onToggleChange = (checked: boolean) => {
    onChange(checked);
  };

  const id = `${propName}-popover`;

  // If the value is not set, we check the schema default. Sometimes the default is not set, so we use false.
  const normalizedValue = value ?? schema.default === true;

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="boolean"
      description={schema.description}
      defaultValue={schema.default?.toString()}
      isRow
    >
      <div className="boolean-field-toggle-wrapper">
        <Toggle
          labelText=""
          onToggle={onToggleChange}
          disabled={disabled}
          id={propName}
          name={propName}
          aria-label={schema.title}
          aria-describedby={id}
          toggled={normalizedValue}
        />
      </div>
    </FieldWrapper>
  );
};
