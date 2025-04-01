import { Badge } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { useFieldValue } from '../../hooks/field-value';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { FieldWrapper } from '../FieldWrapper';
import { KeyValue, KeyValueType } from '../../../../../KeyValue/KeyValue';

export const PropertiesField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value, onChange, disabled } = useFieldValue<KeyValueType | undefined>(propName);

  const items = Object.entries(value ?? {});
  const title = schema.title ?? propName.split('.').pop();

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={
        <>
          {title} <Badge title={`${items.length} properties`}>{items.length}</Badge>
        </>
      }
      type="object"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <KeyValue propName={propName} initialModel={value} onChange={onChange} disabled={disabled} />
    </FieldWrapper>
  );
};
