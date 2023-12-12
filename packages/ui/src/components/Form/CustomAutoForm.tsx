import { AutoField, AutoForm, ErrorsField } from '@kaoto-next/uniforms-patternfly';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { JSONSchemaBridge } from 'uniforms-bridge-json-schema';
import { IDataTestID } from '../../models';
import { CustomAutoFieldDetector } from './CustomAutoField';

interface CustomAutoFormProps extends IDataTestID {
  schemaBridge?: JSONSchemaBridge;
  model: unknown;
  disabled?: boolean;
  onChangeModel: (model: unknown) => void;
}

export const CustomAutoForm = forwardRef<{ fields: HTMLElement[] }, CustomAutoFormProps>((props, forwardedRef) => {
  const fieldsRefs = useRef<HTMLElement[]>([]);
  const sortedFieldsNames = useMemo(() => {
    if (props.schemaBridge === undefined) {
      return [];
    }
    return props.schemaBridge
      .getSubfields()
      .slice()
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
  }));

  return (
    <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
      <AutoForm
        schema={props.schemaBridge}
        model={props.model}
        onChangeModel={props.onChangeModel}
        data-testid={props['data-testid']}
        disabled={props.disabled}
      >
        {sortedFieldsNames.map((field, index) => (
          <AutoField
            key={field}
            name={field}
            inputRef={(node: HTMLElement) => {
              fieldsRefs.current[index] = node;
            }}
          />
        ))}
        <ErrorsField />
      </AutoForm>
    </AutoField.componentDetectorContext.Provider>
  );
});
