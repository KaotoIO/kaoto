import { Form } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { KaotoSchemaDefinition } from '../../../../models';
import { isDefined, ROOT_PATH } from '../../../../utils';
import { AutoField } from './fields/AutoField';
import { FormComponentFactoryProvider } from './providers/FormComponentFactoryProvider';
import { ModelContextProvider } from './providers/ModelProvider';
import { SchemaDefinitionsProvider } from './providers/SchemaDefinitionsProvider';
import { SchemaProvider } from './providers/SchemaProvider';

interface FormProps {
  schema?: KaotoSchemaDefinition['schema'];
  onChange: (propName: string, value: unknown) => void;
  model: unknown;
  omitFields?: string[];
}

export const KaotoForm: FunctionComponent<FormProps> = ({ schema, onChange, model, omitFields = [] }) => {
  const onPropertyChange = useCallback(
    (propName: string, value: unknown) => {
      console.log('KaotoForm.onPropertyChange', propName, value);
      onChange(propName, value);
    },
    [onChange],
  );

  if (!isDefined(schema)) {
    return <div>Schema not defined</div>;
  }

  return (
    <FormComponentFactoryProvider>
      <SchemaDefinitionsProvider schema={schema} omitFields={omitFields}>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
            <Form>
              <AutoField propName={ROOT_PATH} />
            </Form>
          </ModelContextProvider>
        </SchemaProvider>
      </SchemaDefinitionsProvider>
    </FormComponentFactoryProvider>
  );
};
