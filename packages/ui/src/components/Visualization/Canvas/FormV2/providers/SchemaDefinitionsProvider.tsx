import { createContext, FunctionComponent, PropsWithChildren } from 'react';
import { KaotoSchemaDefinition } from '../../../../../models';

type SchemaDefinitionsContextValue = Record<string, KaotoSchemaDefinition['schema']>;

export const SchemaDefinitionsContext = createContext<SchemaDefinitionsContextValue>({});

export const SchemaDefinitionsProvider: FunctionComponent<
  PropsWithChildren<{ schema: KaotoSchemaDefinition['schema'] }>
> = ({ schema, children }) => {
  const definitions: SchemaDefinitionsContextValue = schema.definitions ?? {};

  return <SchemaDefinitionsContext.Provider value={definitions}>{children}</SchemaDefinitionsContext.Provider>;
};
