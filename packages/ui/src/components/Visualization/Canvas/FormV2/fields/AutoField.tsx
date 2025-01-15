import { FunctionComponent, useContext } from 'react';
import { FormComponentFactoryContext } from '../providers/FormComponentFactoryProvider';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';

export const AutoField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const formComponentFactory = useContext(FormComponentFactoryContext);

  if (!schema) {
    return <div>AutoField - Schema not defined</div>;
  }
  if (!formComponentFactory) {
    return <div>AutoField - Form component factory not defined</div>;
  }

  const FieldComponent = formComponentFactory(schema);

  return <FieldComponent propName={propName} required={required} />;
};
