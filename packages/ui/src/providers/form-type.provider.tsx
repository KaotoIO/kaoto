import { FunctionComponent, PropsWithChildren, createContext, useState } from 'react';

export interface FormTypeContextResult {
  onToggleClick: (_event: unknown) => void;
  loadNonDefaultFieldsOnly: boolean;
}
export const FormTypeContext = createContext<FormTypeContextResult>({
  onToggleClick: () => {},
  loadNonDefaultFieldsOnly: false,
});

/**
 * Used for toggling between the normal form and the reduced form
 */
export const FormTypeProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [value, setValue] = useState<boolean>(false);
  const onToggleClick = (_event: unknown) => {
    setValue(!value);
  };
  return (
    <FormTypeContext.Provider
      value={{
        onToggleClick,
        loadNonDefaultFieldsOnly: value,
      }}
    >
      {props.children}
    </FormTypeContext.Provider>
  );
};
