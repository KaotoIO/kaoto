import { FormGroup, FormGroupLabelHelp, Popover, TextInput } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';

export const StringField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange } = useFieldValue<string>(propName);
  const onFieldChange = (_event: unknown, value: string) => {
    onChange(value);
  };

  if (!schema) {
    return <div>StringField - Schema not defined</div>;
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
      <TextInput
        type="text"
        id={propName}
        name={propName}
        value={value}
        onChange={onFieldChange}
        aria-describedby={id}
      />
    </FormGroup>
  );
};
