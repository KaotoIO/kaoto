import { createContext, FunctionComponent, PropsWithChildren, useMemo } from 'react';

export interface ModelContextValue {
  model: unknown;
  errors?: Record<string, string[]>;
  onPropertyChange: (propName: string, value: unknown) => void;
  disabled?: boolean;
}

export const ModelContext = createContext<ModelContextValue>({ model: {}, onPropertyChange: () => {} });

export const ModelContextProvider: FunctionComponent<PropsWithChildren<ModelContextValue>> = ({
  model,
  errors,
  onPropertyChange,
  disabled,
  children,
}) => {
  const value = useMemo(() => {
    return { model, errors, onPropertyChange, disabled };
  }, [model, errors, onPropertyChange, disabled]);

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};
