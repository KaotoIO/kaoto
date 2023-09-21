import { FunctionComponent, PropsWithChildren, createContext } from 'react';
import { useEntities } from '../hooks';
import { BaseCamelEntity } from '../models/camel-entities';
import { BaseVisualCamelEntity } from '../models/visualization/base-visual-entity';

interface EntitiesContextResult {
  code: string;
  setCode: (code: string) => void;
  entities: BaseCamelEntity[];
  visualEntities: BaseVisualCamelEntity[];
}

export const EntitiesContext = createContext<EntitiesContextResult | undefined>(undefined);

export const EntitiesProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const value = useEntities();

  return <EntitiesContext.Provider value={value}>{props.children}</EntitiesContext.Provider>;
};
