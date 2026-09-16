import { Form } from '@carbon/react';
import { JSONSchema4 } from 'json-schema';
import {
  FormEventHandler,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AutoField } from './fields/AutoField';
import { NoFieldFound } from './Form/NoFieldFound';
import './KaotoForm.scss';
import { IDataTestID } from './models';
import { CustomFieldsFactory, FormComponentFactoryProvider } from './providers/FormComponentFactoryProvider';
import { ModelContextProvider } from './providers/ModelProvider';
import { SchemaDefinitionsProvider } from './providers/SchemaDefinitionsProvider';
import { SchemaProvider } from './providers/SchemaProvider';
import { isDefined, ROOT_PATH, setValue } from './utils';
import { errorsMapper } from './validation/errors-mapper';
import { getValidator } from './validation/get-validator';

export interface KaotoFormApi {
  validate: () => Record<string, string[]> | null;
}

export interface KaotoFormProps extends IDataTestID {
  schema?: JSONSchema4;
  model: unknown;
  omitFields?: string[];
  disabled?: boolean;
  onChange?: (value: unknown) => void;
  onChangeProp?: (propName: string, value: unknown) => void;
  customFieldsFactory?: CustomFieldsFactory;
}

export const KaotoForm = forwardRef<KaotoFormApi, KaotoFormProps>(
  (
    {
      'data-testid': dataTestId,
      schema,
      model,
      omitFields = [],
      disabled,
      onChange,
      onChangeProp,
      customFieldsFactory,
    },
    forwardRef,
  ) => {
    if (!isDefined(schema)) {
      throw new Error('[KaotoForm]: Schema is required');
    }

    const [formModel, setFormModel] = useState<unknown>(model);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
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

    const validator = useMemo(() => getValidator(schema), [schema]);

    const schemaValidator = useCallback(
      (model: unknown) => {
        validator?.(model);
        const mappedErrors = errorsMapper(validator?.errors);
        setValidationErrors(mappedErrors);

        return Object.keys(mappedErrors).length > 0 ? mappedErrors : null;
      },
      [validator],
    );

    useImperativeHandle(forwardRef, () => ({ validate: () => schemaValidator(formModel) }), [
      formModel,
      schemaValidator,
    ]);

    const onSubmit: FormEventHandler<HTMLFormElement> = useCallback((event) => {
      event.preventDefault();
    }, []);

    return (
      <FormComponentFactoryProvider customFieldsFactory={customFieldsFactory}>
        <SchemaDefinitionsProvider schema={schema} omitFields={omitFields}>
          <SchemaProvider schema={schema}>
            <ModelContextProvider
              model={formModel}
              errors={validationErrors}
              onPropertyChange={onPropertyChange}
              disabled={disabled}
            >
              <Form onSubmit={onSubmit} className="kaoto-form kaoto-form__label" data-testid={dataTestId}>
                <AutoField propName={ROOT_PATH} />
              </Form>

              <NoFieldFound className="kaoto-form kaoto-form__empty" />
            </ModelContextProvider>
          </SchemaProvider>
        </SchemaDefinitionsProvider>
      </FormComponentFactoryProvider>
    );
  },
);
