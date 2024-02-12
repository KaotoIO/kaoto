import { AutoField, AutoFields, AutoForm, ErrorsField } from '@kaoto-next/uniforms-patternfly';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';
import { IDataTestID } from '../../models';
import { CustomAutoFieldDetector } from './CustomAutoField';

interface CustomAutoFormProps extends IDataTestID {
  schemaBridge?: JSONSchemaBridge;
  model: unknown;
  disabled?: boolean;
  sortFields?: boolean;
  omitFields?: string[];
  onChangeModel?: (model: unknown) => void;
  onChange?: (path: string, value: unknown) => void;
}

export type CustomAutoFormRef = { fields: HTMLElement[]; form: typeof AutoForm };

export const CustomAutoForm = forwardRef<CustomAutoFormRef, CustomAutoFormProps>((props, forwardedRef) => {
  const formRef = useRef<typeof AutoForm>();
  const fieldsRefs = useRef<HTMLElement[]>([]);
  const sortedFieldsNames = useMemo(() => {
    if (props.schemaBridge === undefined || !props.sortFields) {
      return [];
    }
    return props.schemaBridge
      .getSubfields()
      .slice()
      .filter((field) => {
        if (!Array.isArray(props.omitFields)) return true;

        return !props.omitFields.includes(field);
      })
      .sort((a, b) => {
        const propsA = props.schemaBridge?.getProps(a);
        const propsB = props.schemaBridge?.getProps(b);
        if (propsA.required) {
          return propsB.required ? 0 : -1;
        }
        return propsB.required ? 1 : 0;
      });
  }, [props.schemaBridge]);

  useImperativeHandle(forwardedRef, () => ({
    fields: fieldsRefs.current,
    form: formRef.current,
  }));

  return (
    <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
      <AutoForm
        ref={formRef}
        schema={props.schemaBridge}
        model={props.model}
        onChangeModel={props.onChangeModel}
        onChange={props.onChange}
        data-testid={props['data-testid']}
        disabled={props.disabled}
      >
        {props.sortFields ? (
          // For some forms, sorting its fields might be beneficial
          sortedFieldsNames.map((field, index) => (
            <AutoField
              key={field}
              name={field}
              inputRef={(node: HTMLElement) => {
                fieldsRefs.current[index] = node;
              }}
            />
          ))
        ) : (
          <AutoFields omitFields={props.omitFields} />
        )}
        <ErrorsField />
      </AutoForm>
    </AutoField.componentDetectorContext.Provider>
  );
});
