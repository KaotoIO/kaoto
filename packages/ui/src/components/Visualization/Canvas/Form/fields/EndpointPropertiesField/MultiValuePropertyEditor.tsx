import { FieldProps, ModelContextProvider, ObjectField, SchemaContext, setValue, useFieldValue } from '@kaoto/forms';
import { cloneDeep } from 'lodash';
import { FunctionComponent, useContext, useMemo } from 'react';

import { ParsedParameters } from '../../../../../../utils';
import { MultiValuePropertyService } from './MultiValueProperty.service';

export const MultiValuePropertyEditor: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value: flatParameters = {}, onChange, disabled } = useFieldValue<ParsedParameters | undefined>(propName);

  const componentName = useMemo(() => {
    const name = schema['x-component-name'] as string | undefined;
    return name || '';
  }, [schema]);
  const parametersWithMultivalue = {
    parameters: MultiValuePropertyService.readMultiValue(componentName, flatParameters),
  };

  const onPropertyChange = (path: string, value: unknown) => {
    const updatedDefinition = cloneDeep(parametersWithMultivalue);

    let updatedValue = value;
    if (typeof value === 'string' && value.trim() === '') {
      updatedValue = undefined;
    }
    setValue(updatedDefinition, path, updatedValue);

    const multiValueParameters = MultiValuePropertyService.getMultiValueSerializedDefinition(
      componentName,
      updatedDefinition,
    );

    if (
      multiValueParameters &&
      typeof multiValueParameters === 'object' &&
      'parameters' in multiValueParameters &&
      typeof multiValueParameters.parameters === 'object'
    ) {
      onChange(multiValueParameters.parameters as ParsedParameters);
    }
  };

  return (
    <ModelContextProvider onPropertyChange={onPropertyChange} model={parametersWithMultivalue} disabled={disabled}>
      <ObjectField propName={propName} required={required} />
    </ModelContextProvider>
  );
};
