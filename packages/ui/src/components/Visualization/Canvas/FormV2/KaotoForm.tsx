import { Form } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { IDataTestID, KaotoSchemaDefinition } from '../../../../models';
import { isDefined, ROOT_PATH, setValue } from '../../../../utils';
import { NoFieldFound } from '../../../Form/NoFieldFound';
import { AutoField } from './fields/AutoField';
import './KaotoForm.scss';
import { FormComponentFactoryProvider } from './providers/FormComponentFactoryProvider';
import { ModelContextProvider } from './providers/ModelProvider';
import { SchemaDefinitionsProvider } from './providers/SchemaDefinitionsProvider';
import { SchemaProvider } from './providers/SchemaProvider';

export interface KaotoFormProps extends IDataTestID {
  schema?: KaotoSchemaDefinition['schema'];
  onChange?: (value: unknown) => void;
  onChangeProp?: (propName: string, value: unknown) => void;
  model: unknown;
  omitFields?: string[];
}

export const KaotoForm: FunctionComponent<KaotoFormProps> = ({
  schema,
  onChange,
  onChangeProp,
  model,
  omitFields = [],
  'data-testid': dataTestId,
}) => {
  const [formModel, setFormModel] = useState<unknown>(model);
  const onChangeRef = useRef(onChange);
  const isFirstRender = useRef(true);

  /**
   * This useEffect updates the onChangeRef.current value every time the onChange prop changes
   * This way, the onChangeRef.current will always have the latest onChange function
   * but without triggering the useEffect that notifies the consumer about the form being updated
   */
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  /**
   * This useEffect notifies the consumer about the entire form being updated
   * It depends on the formModel state, so it will be triggered every time the formModel changes
   * but not when the onChange function changes since it's not in the dependency array
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    onChangeRef.current?.(formModel);
  }, [formModel]);

  /**
   * Update the formModel state when a property changes
   */
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
