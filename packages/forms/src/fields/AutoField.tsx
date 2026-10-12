import { FunctionComponent, useContext } from 'react';

import { useFieldValue } from '../hooks/field-value';
import { FieldProps } from '../models/typings';
import { CanvasFormTabsContext } from '../providers/canvas-form-tabs.provider';
import { FormComponentFactoryContext } from '../providers/context/form-component-factory-context';
import { SchemaContext } from '../providers/SchemaProvider';
import { isDefined, isFieldTabVisible } from '../utils';

export const AutoField: FunctionComponent<FieldProps> = ({ propName, required, onRemove }) => {
  const { selectedTab } = useContext(CanvasFormTabsContext);
  const { schema } = useContext(SchemaContext);
  const { value } = useFieldValue<unknown>(propName);
  const formComponentFactory = useContext(FormComponentFactoryContext);

  if (Object.keys(schema).length === 0) {
    throw new Error(`AutoField: schema is not defined for ${propName}`);
  } else if (!isDefined(formComponentFactory)) {
    throw new Error(`AutoField: formComponentFactory is not defined for ${propName}`);
  }

  // If required is not defined, it is considered as required
  const isFieldRequired = !isDefined(required) || (isDefined(required) && required);

  if (!isFieldTabVisible(schema, value, isFieldRequired, selectedTab)) {
    return null;
  }

  const FieldComponent = formComponentFactory(schema);

  // The factory returns a stable reference to an existing component, it doesn't create a new one on each render
  // eslint-disable-next-line react-hooks/static-components
  return <FieldComponent propName={propName} required={required} onRemove={onRemove} />;
};
