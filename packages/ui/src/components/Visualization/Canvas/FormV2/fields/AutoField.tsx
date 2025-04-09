import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext } from '../../../../../providers/canvas-form-tabs.provider';
import { isDefined } from '../../../../../utils';
import { useFieldValue } from '../hooks/field-value';
import { FormComponentFactoryContext } from '../providers/FormComponentFactoryProvider';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';

export const AutoField: FunctionComponent<FieldProps> = ({ propName, required, onRemove }) => {
  const { selectedTab } = useContext(CanvasFormTabsContext);
  const { schema } = useContext(SchemaContext);
  const { value } = useFieldValue<object>(propName);
  const formComponentFactory = useContext(FormComponentFactoryContext);

  if (Object.keys(schema).length === 0) {
    throw new Error(`AutoField: schema is not defined for ${propName}`);
  } else if (!isDefined(formComponentFactory)) {
    throw new Error(`AutoField: formComponentFactory is not defined for ${propName}`);
  }

  const isFieldDefined = isDefined(value) && Object.keys(value).length > 0;
  const isComplexFieldType =
    schema.type === 'object' || schema.type === 'array' || 'oneOf' in schema || 'anyOf' in schema;
  // If required is not defined, it is considered as required
  const isFieldRequired = !isDefined(required) || (isDefined(required) && required);
  const isPropertiesField = schema.type === 'object' && Object.keys(schema?.properties ?? {}).length === 0;
  const shouldLoadField = isFieldRequired || (isDefined(value) && isComplexFieldType && !isPropertiesField);

  if ((selectedTab === 'Required' && !shouldLoadField) || (selectedTab === 'Modified' && !isFieldDefined)) {
    return null;
  }

  const FieldComponent = formComponentFactory(schema);

  return <FieldComponent propName={propName} required={required} onRemove={onRemove} />;
};
