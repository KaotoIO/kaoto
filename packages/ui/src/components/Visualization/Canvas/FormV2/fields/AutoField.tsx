import { FunctionComponent, useContext } from 'react';
import { FormComponentFactoryContext } from '../providers/FormComponentFactoryProvider';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { isDefined } from '../../../../../utils';
import { CanvasFormTabsContext } from '../../../../../providers/canvas-form-tabs.provider';
import { useFieldValue } from '../hooks/field-value';

export const AutoField: FunctionComponent<FieldProps> = ({ propName, required, onRemove }) => {
  const { selectedTab } = useContext(CanvasFormTabsContext);
  const { schema } = useContext(SchemaContext);
  const { value } = useFieldValue<object>(propName);
  const formComponentFactory = useContext(FormComponentFactoryContext);

  const isFieldDefined = isDefined(value);
  const isObjectTypefield = schema.type === 'object' || 'oneOf' in schema || 'anyOf' in schema;
  const IsFieldRequired = !isDefined(required) || (isDefined(required) && required);
  const shouldLoadField = IsFieldRequired || (isFieldDefined && isObjectTypefield);

  if ((selectedTab === 'Required' && !shouldLoadField) || (selectedTab === 'Modified' && !isFieldDefined)) {
    return null;
  }

  if (!schema) {
    return <div>AutoField - Schema not defined</div>;
  }
  if (!formComponentFactory) {
    return <div>AutoField - Form component factory not defined</div>;
  }

  const FieldComponent = formComponentFactory(schema);

  return <FieldComponent propName={propName} required={required} onRemove={onRemove} />;
};
