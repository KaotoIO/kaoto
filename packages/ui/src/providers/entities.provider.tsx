import { FunctionComponent, PropsWithChildren, createContext } from 'react';
import { EntitiesContextResult, useEntities } from '../hooks';

export const EntitiesContext = createContext<EntitiesContextResult | undefined>(undefined);

export const EntitiesProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const value = useEntities();

  return <EntitiesContext.Provider value={value}>{props.children}</EntitiesContext.Provider>;
};
