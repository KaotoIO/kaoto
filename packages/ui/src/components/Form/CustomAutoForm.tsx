import { AutoField, AutoForm, ErrorsField } from '@kaoto-next/uniforms-patternfly';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { useSchemaBridgeContext } from '../../hooks';
import { IDataTestID } from '../../models';
import { CustomAutoFieldDetector } from './CustomAutoField';
import { CustomAutoFields } from './CustomAutoFields';

interface CustomAutoFormProps extends IDataTestID {
  model: unknown;
  disabled?: boolean;
  sortFields?: boolean;
  omitFields?: string[];
  onChangeModel?: (model: unknown) => void;
  onChange?: (path: string, value: unknown) => void;
  handleConfirm?: () => void;
}

export type CustomAutoFormRef = { fields: HTMLElement[]; form: typeof AutoForm };

export const CustomAutoForm = forwardRef<CustomAutoFormRef, CustomAutoFormProps>((props, forwardedRef) => {
  const { schemaBridge } = useSchemaBridgeContext();
  const formRef = useRef<typeof AutoForm>();
  const fieldsRefs = useRef<HTMLElement[]>([]);
  const sortedFieldsNames = useMemo(() => {
    if (schemaBridge === undefined || !props.sortFields) {
      return [];
    }
    return schemaBridge
      .getSubfields()
      .slice()
      .filter((field) => {
        if (!Array.isArray(props.omitFields)) return true;

        return !props.omitFields.includes(field);
      })
      .sort((a, b) => {
        const propsA = schemaBridge.getProps(a);
        const propsB = schemaBridge.getProps(b);
        if (propsA.required) {
          return propsB.required ? 0 : -1;
        }
        return propsB.required ? 1 : 0;
      });
  }, [props.omitFields, props.sortFields, schemaBridge]);

  useImperativeHandle(forwardedRef, () => ({
    fields: fieldsRefs.current,
    form: formRef.current,
  }));
  return (
    <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
      <AutoForm
        ref={formRef}
        schema={schemaBridge}
        model={props.model}
        onChangeModel={props.onChangeModel}
        onChange={props.onChange}
        data-testid={props['data-testid']}
        disabled={props.disabled}
        onSubmit={props.handleConfirm}
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
          <CustomAutoFields omitFields={props.omitFields} />
        )}
        <ErrorsField />
      </AutoForm>
    </AutoField.componentDetectorContext.Provider>
  );
});
