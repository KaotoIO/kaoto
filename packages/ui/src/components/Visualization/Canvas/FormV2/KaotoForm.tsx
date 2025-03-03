import { Form } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useState } from 'react';
import { IDataTestID, KaotoSchemaDefinition } from '../../../../models';
import { isDefined, ROOT_PATH, setValue } from '../../../../utils';
import { NoFieldFound } from '../../../Form/NoFieldFound';
import { AutoField } from './fields/AutoField';
import './KaotoForm.scss';
import { FormComponentFactoryProvider } from './providers/FormComponentFactoryProvider';
import { ModelContextProvider } from './providers/ModelProvider';
import { SchemaDefinitionsProvider } from './providers/SchemaDefinitionsProvider';
import { SchemaProvider } from './providers/SchemaProvider';

export interface FormProps extends IDataTestID {
  schema?: KaotoSchemaDefinition['schema'];
  onChange?: (value: unknown) => void;
  onChangeProp?: (propName: string, value: unknown) => void;
  model: unknown;
  omitFields?: string[];
}

export const KaotoForm: FunctionComponent<FormProps> = ({
  schema,
  onChange,
  onChangeProp,
  model,
  omitFields = [],
  'data-testid': dataTestId,
}) => {
  const [formModel, setFormModel] = useState<unknown>(model);

  const onPropertyChange = useCallback(
    (propName: string, value: unknown) => {
      onChangeProp?.(propName, value);
      setFormModel((prevModel: unknown) => {
        if (typeof prevModel !== 'object') {
          return value;
        }

        const newModel = { ...prevModel };
        setValue(newModel, propName, value);
        return newModel;
      });
    },
    [onChangeProp],
  );

  useEffect(() => {
    onChange?.(formModel);
  }, [formModel, onChange]);

  if (!isDefined(schema)) {
    return <div>Schema not defined</div>;
  }

  return (
    <FormComponentFactoryProvider>
      <SchemaDefinitionsProvider schema={schema} omitFields={omitFields}>
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={formModel} onPropertyChange={onPropertyChange}>
            <Form data-testid={dataTestId} className="kaoto-form kaoto-form__label">
              <AutoField propName={ROOT_PATH} />
            </Form>
            <NoFieldFound className="kaoto-form kaoto-form__empty" />
          </ModelContextProvider>
        </SchemaProvider>
      </SchemaDefinitionsProvider>
    </FormComponentFactoryProvider>
  );
};
