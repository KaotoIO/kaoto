import { Badge, FormGroup, FormGroupLabelHelp, Popover } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { useFieldValue } from '../../hooks/field-value';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { KeyValue, KeyValueType } from './KeyValue';

export const PropertiesField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value, onChange } = useFieldValue<KeyValueType | undefined>(propName);

  const items = Object.entries(value ?? {});

  const id = `${propName}-popover`;

  return (
    <FormGroup
      fieldId={propName}
      label={
        <>
          {schema.title} ({propName}) <Badge title={`${items.length} properties`}>{items.length}</Badge>
        </>
      }
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
      <KeyValue initialModel={value} onChange={onChange} />
    </FormGroup>
  );
};
