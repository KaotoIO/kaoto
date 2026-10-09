import './EditInPlaceField.scss';

import { EditInPlace } from '@carbon/ibm-products';
import { FunctionComponent, useContext, useEffect, useState } from 'react';

import { useFieldValue } from '../../hooks/field-value';
import { FieldProps } from '../../models/typings';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldWrapper } from '../FieldWrapper';

export const EditInPlaceField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange } = useFieldValue<string | undefined>(propName);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const label = schema.title ?? 'URI';

  let defaultValue: string | undefined;
  if (schema.default !== undefined && schema.default !== null) {
    defaultValue = typeof schema.default === 'object' ? JSON.stringify(schema.default) : String(schema.default);
  }

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={label}
      type="string"
      description={schema.description}
      defaultValue={defaultValue}
    >
      <div className="uri-field-container">
        <div className="uri-field-input-wrapper uri-field-input">
          <EditInPlace
            id={propName}
            labelText={label}
            value={localValue}
            placeholder="Click to add 'uri'"
            editAlwaysVisible
            saveLabel="Save"
            cancelLabel="Cancel"
            editLabel={`Edit ${label}`}
            onChange={(val) => {
              setLocalValue(val);
            }}
            onSave={() => {
              onChange(localValue || undefined);
            }}
            onCancel={(initial) => {
              setLocalValue(initial);
            }}
          />
        </div>
      </div>
    </FieldWrapper>
  );
};
