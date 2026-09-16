import { JSONSchema4 } from 'json-schema';
import { createContext, FunctionComponent, PropsWithChildren, useContext, useMemo, useState } from 'react';
import componentSchemas from '../../assets/schemas/camel-components.json';

type SchemaEntry = { name: string; value: JSONSchema4 };
interface ICurrentSchemaProviderProps {
  schema?: SchemaEntry;
  schemas: SchemaEntry[];
  setSchema: (schema?: SchemaEntry) => void;
}

const CurrentSchemaContext = createContext<ICurrentSchemaProviderProps | undefined>(undefined);

export const useCurrentSchema = (): ICurrentSchemaProviderProps => {
  const context = useContext(CurrentSchemaContext);
  if (!context) {
    throw new Error('useCurrentSchema must be used within a CurrentSchemaProvider');
  }
  return context;
};

export const CurrentSchemaProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const schemas: SchemaEntry[] = useMemo(
    () => Object.entries(componentSchemas).map(([name, schema]) => ({ name, value: schema as JSONSchema4 })),
    [],
  );

  const [schema, setSchema] = useState<SchemaEntry | undefined>({
    name: 'log',
    value: componentSchemas['log'] as JSONSchema4,
  });

  const value = useMemo(() => ({ schema, schemas, setSchema }), [schema, schemas]);

  return <CurrentSchemaContext.Provider value={value}>{children}</CurrentSchemaContext.Provider>;
};
