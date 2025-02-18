import { createContext, FunctionComponent, PropsWithChildren, useMemo } from 'react';

export interface ModelContextValue {
  model: unknown;
  onPropertyChange: (propName: string, value: unknown) => void;
}

export const ModelContext = createContext<ModelContextValue>({ model: {}, onPropertyChange: () => {} });

export const ModelContextProvider: FunctionComponent<PropsWithChildren<ModelContextValue>> = ({
  model,
  onPropertyChange,
  children,
}) => {
  const value = useMemo(() => {
    return { model, onPropertyChange };
  }, [model, onPropertyChange]);

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};
