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
  onChange: (propName: string, value: any) => void;
  model: any;
}

export const KaotoForm: FunctionComponent<FormProps> = ({ schema, onChange, model }) => {
  const onPropertyChange = useCallback(
    (propName: string, value: any) => {
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
      <SchemaDefinitionsProvider schema={schema}>
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
