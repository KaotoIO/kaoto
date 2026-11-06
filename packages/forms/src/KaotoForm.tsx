import './KaotoForm.scss';

import { Form, Layer, preview_Layout as Layout, useLayer } from '@carbon/react';
import { JSONSchema4 } from 'json-schema';
import {
  forwardRef,
  Fragment,
  ReactNode,
  SubmitEventHandler,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { AutoField } from './fields/AutoField';
import { FormToolbar } from './Form/FormToolbar';
import { NoFieldFound } from './Form/NoFieldFound';
import { IDataTestID } from './models';
import { CanvasFormTabsProvider, TabKeys } from './providers/canvas-form-tabs.provider';
import { FilteredFieldProvider } from './providers/filtered-field.provider';
import { CustomFieldsFactory, FormComponentFactoryProvider } from './providers/FormComponentFactoryProvider';
import { ModelContextProvider } from './providers/ModelProvider';
import { SchemaDefinitionsProvider } from './providers/SchemaDefinitionsProvider';
import { SchemaProvider } from './providers/SchemaProvider';
import { isDefined, ROOT_PATH, setValue } from './utils';
import { errorsMapper } from './validation/errors-mapper';
import { getValidator } from './validation/get-validator';

interface FormState {
  sourceModel: unknown;
  model: unknown;
  change?: { model: unknown };
}

export interface KaotoFormApi {
  validate: () => Record<string, string[]> | null;
}

export interface KaotoFormProps extends IDataTestID {
  schema?: JSONSchema4;
  model: unknown;
  omitFields?: string[];
  disabled?: boolean;
  /**
   * Wrap the form in a Carbon `<Layer>` when no ancestor provides one. Defaults to `true`.
   */
  withLayer?: boolean;
  /**
   * Renders the "Find properties by name" search above the fields. Defaults to `false`.
   */
  showFilterField?: boolean;
  /**
   * Renders the Required / All / Modified switcher above the fields. Defaults to `false`.
   */
  showSectionTabs?: boolean;
  /**
   * Tab selected on mount, whether or not the switcher is shown. Changing it afterwards has no effect.
   * Defaults to `All`.
   */
  defaultSectionTab?: TabKeys;
  /**
   * Extra content rendered right below the filter field / section tabs and above the fields. It lives inside
   * the form providers, `<Layer>` and `<Layout>`, so it gets the same background, density and field state.
   */
  children?: ReactNode;
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
      withLayer = true,
      showFilterField = false,
      showSectionTabs = false,
      defaultSectionTab = 'All',
      children,
      onChange,
      onChangeProp,
      customFieldsFactory,
    },
    forwardRef,
  ) => {
    if (!isDefined(schema)) {
      throw new Error('[KaotoForm]: Schema is required');
    }

    /**
     * Keep the form model in sync with the model provided by the consumer.
     * Edits made through the form are tracked in `change`, so the consumer is only
     * notified about local edits, not about its own model updates.
     */
    const [formState, setFormState] = useState<FormState>({ sourceModel: model, model });
    if (!Object.is(formState.sourceModel, model)) {
      setFormState({ ...formState, sourceModel: model, model });
    }
    const formModel = formState.model;
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const onChangeRef = useRef(onChange);

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
     * It only runs for changes made through the form, not when the consumer provides a new model
     */
    useEffect(() => {
      if (formState.change) {
        onChangeRef.current?.(formState.change.model);
      }
    }, [formState.change]);

    /**
     * Update the form model state when a property changes
     */
    const onPropertyChange = useCallback(
      (propName: string, value: unknown) => {
        onChangeProp?.(propName, value);
        setFormState((previous) => {
          if (typeof previous.model !== 'object') {
            return { ...previous, model: value, change: { model: value } };
          }

          const newModel = { ...previous.model };
          setValue(newModel, propName, value);
          return { ...previous, model: newModel, change: { model: newModel } };
        });
      },
      [onChangeProp],
    );

    /**
     * Carbon inputs take their background from the closest `<Layer>`. When no ancestor provides one
     * (the default level is 1), the inputs would blend with the page background, so we add it here.
     * If an ancestor already did (sidebar, modal, nested form...), we avoid stacking another one.
     */
    const { level } = useLayer();
    const shouldAddLayer = withLayer && level <= 1;
    const LayerWrapper = shouldAddLayer ? Layer : Fragment;

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

    const onSubmit: SubmitEventHandler<HTMLFormElement> = useCallback((event) => {
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
              {/* Providers mounted above the form are ignored on purpose: every form owns its tab and filter state */}
              <CanvasFormTabsProvider tab={defaultSectionTab} showSectionTabs={showSectionTabs}>
                <FilteredFieldProvider>
                  {/* One place to set the density of every control in the form and its toolbar */}
                  <Layout size="sm">
                    {(showFilterField || showSectionTabs) && (
                      <FormToolbar
                        showFilterField={showFilterField}
                        showSectionTabs={showSectionTabs}
                        withLayer={shouldAddLayer}
                      />
                    )}

                    <LayerWrapper>
                      {children}

                      <Form onSubmit={onSubmit} className="kaoto-form kaoto-form__label" data-testid={dataTestId}>
                        <AutoField propName={ROOT_PATH} />
                      </Form>

                      <NoFieldFound className="kaoto-form kaoto-form__empty" />
                    </LayerWrapper>
                  </Layout>
                </FilteredFieldProvider>
              </CanvasFormTabsProvider>
            </ModelContextProvider>
          </SchemaProvider>
        </SchemaDefinitionsProvider>
      </FormComponentFactoryProvider>
    );
  },
);
