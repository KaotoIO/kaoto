import { Checkbox, FormGroup, FormGroupLabelHelp, Popover } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';

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
    <FormGroup
      fieldId={propName}
      label={`${schema.title} (${propName})`}
      isRequired={required}
      labelHelp={
        <Popover
          id={id}
          headerContent={<p>{schema.title}</p>}
          bodyContent={<p>{schema.description}</p>}
          footerContent={<p>Default: {schema.default?.toString() ?? 'no default value'}</p>}
          triggerAction="hover"
          withFocusTrap={false}
        >
          <FormGroupLabelHelp aria-label={`More info for ${schema.title} field`} />
        </Popover>
      }
    >
      <Checkbox
        id={propName}
        name={propName}
        aria-describedby={id}
        isChecked={value}
        checked={value}
        onChange={onFieldChange}
      />
    </FormGroup>
  );
};
