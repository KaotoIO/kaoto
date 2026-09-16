import { createContext, FunctionComponent, PropsWithChildren, useContext, useMemo, useState } from 'react';

interface IModelProviderProps {
  model?: unknown;
  setModel: (model: unknown | undefined) => void;
}

const ModelContext = createContext<IModelProviderProps | undefined>(undefined);
export const useModel = (): IModelProviderProps => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};

export const ModelProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [model, setModel] = useState<unknown | undefined>(undefined);

  const value = useMemo(() => ({ model, setModel }), [model, setModel]);

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
};
