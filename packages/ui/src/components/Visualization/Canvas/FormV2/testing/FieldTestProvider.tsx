import { FunctionComponent, PropsWithChildren } from 'react';
import { isDefined } from '../../../../../utils';
import { FormProps } from '../KaotoForm';
import { FormComponentFactoryProvider } from '../providers/FormComponentFactoryProvider';
import { ModelContextProvider } from '../providers/ModelProvider';
import { SchemaDefinitionsProvider } from '../providers/SchemaDefinitionsProvider';
import { SchemaProvider } from '../providers/SchemaProvider';

export const FieldTestProvider: (props: Partial<FormProps>) => {
  Provider: FunctionComponent<PropsWithChildren>;
  onChange: FormProps['onChangeProp'];
} = ({ schema, onChangeProp: onChange = jest.fn(), model, omitFields = [] }) => {
  if (!isDefined(schema)) {
    throw new Error('FieldTestProvider: Schema not defined');
  }

  const Provider: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <FormComponentFactoryProvider>
      <SchemaDefinitionsProvider schema={schema} omitFields={omitFields}>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={model} onPropertyChange={onChange}>
            {children}
          </ModelContextProvider>
        </SchemaProvider>
      </SchemaDefinitionsProvider>
    </FormComponentFactoryProvider>
  );

  return { Provider, onChange };
};
