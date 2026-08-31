import { FieldProps, ModelContextProvider, ObjectField, SchemaContext, setValue, useFieldValue } from '@kaoto/forms';
import { cloneDeep } from 'lodash';
import { FunctionComponent, Suspense, use, useContext, useMemo } from 'react';

import { ParsedParameters } from '../../../../../../utils';
import { Loading } from '../../../../../Loading';
import { MultiValuePropertyService } from './MultiValueProperty.service';

export const MultiValuePropertyEditor: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const catalogKind = schema['x-endpoint-catalog-kind'];
  const componentName = schema['x-component-name'];

  const multiValuePromise = useMemo(() => {
    return MultiValuePropertyService.getMultiValueProperties(catalogKind, componentName);
  }, [catalogKind, componentName]);

  return (
    <Suspense fallback={<Loading />}>
      <MultiValuePropertyEditorInner propName={propName} required={required} promise={multiValuePromise} />
    </Suspense>
  );
};

const MultiValuePropertyEditorInner: FunctionComponent<FieldProps & { promise: Promise<Map<string, string>> }> = ({
  propName,
  required,
  promise,
}) => {
  const { value: flatParameters = {}, onChange, disabled } = useFieldValue<ParsedParameters | undefined>(propName);

  const multiValueProperties = use(promise);

  const parametersWithMultivalue = {
    parameters: MultiValuePropertyService.readMultiValue(multiValueProperties, flatParameters),
  };

  const onPropertyChange = async (path: string, value: unknown) => {
    const updatedDefinition = cloneDeep(parametersWithMultivalue);

    let updatedValue = value;
    if (typeof value === 'string' && value.trim() === '') {
      updatedValue = undefined;
    }
    setValue(updatedDefinition, path, updatedValue);

    const multiValueParameters = MultiValuePropertyService.getMultiValueSerializedDefinition(
      multiValueProperties,
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
