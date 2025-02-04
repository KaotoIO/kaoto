import { createContext, FunctionComponent, PropsWithChildren, useMemo } from 'react';
import { KaotoSchemaDefinition } from '../../../../../models';

interface SchemaDefinitionsContextValue {
  definitions: Record<string, KaotoSchemaDefinition['schema']>;
  omitFields: string[];
}

export const SchemaDefinitionsContext = createContext<SchemaDefinitionsContextValue>({
  definitions: {},
  omitFields: [],
});

export const SchemaDefinitionsProvider: FunctionComponent<
  PropsWithChildren<{ schema: KaotoSchemaDefinition['schema']; omitFields: string[] }>
> = ({ schema, omitFields, children }) => {
  const value = useMemo(() => {
    const definitions: SchemaDefinitionsContextValue['definitions'] = schema.definitions ?? {};

    return { definitions, omitFields };
  }, [omitFields, schema.definitions]);

  return <SchemaDefinitionsContext.Provider value={value}>{children}</SchemaDefinitionsContext.Provider>;
};
