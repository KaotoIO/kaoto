import { Checkbox } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldWrapper } from './FieldWrapper';

export const BooleanField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value, onChange } = useFieldValue<boolean>(propName);
  const onFieldChange = (_event: unknown, checked: boolean) => {
    onChange(checked);
  };

  if (!schema) {
    return <div>BooleanField - Schema not defined</div>;
  }

  const id = `${propName}-popover`;

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="boolean"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <Checkbox
        id={propName}
        name={propName}
        aria-describedby={id}
        isChecked={value}
        checked={value}
        onChange={onFieldChange}
      />
    </FieldWrapper>
  );
};
