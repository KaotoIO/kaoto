import { JSONSchema4 } from 'json-schema';
import { createContext, FunctionComponent, PropsWithChildren, useContext, useMemo } from 'react';
import { resolveSchemaWithRef } from '../utils';
import { SchemaDefinitionsContext } from './SchemaDefinitionsProvider';

export interface SchemaContextValue {
  schema: JSONSchema4;
  definitions: Record<string, JSONSchema4>;
}

export const SchemaContext = createContext<SchemaContextValue>({ schema: {}, definitions: {} });

export const SchemaProvider: FunctionComponent<PropsWithChildren<{ schema: JSONSchema4 }>> = ({ schema, children }) => {
  const { definitions, omitFields } = useContext(SchemaDefinitionsContext);

  const value = useMemo(() => {
    const resolvedSchema = resolveSchemaWithRef(schema, definitions);

    if (Array.isArray(resolvedSchema.anyOf)) {
      resolvedSchema.anyOf = resolvedSchema.anyOf.map((anyOfSchema) => resolveSchemaWithRef(anyOfSchema, definitions));
    }
    if (Array.isArray(resolvedSchema.oneOf)) {
      resolvedSchema.oneOf = resolvedSchema.oneOf.map((oneOfSchema) => resolveSchemaWithRef(oneOfSchema, definitions));
    }

    omitFields.forEach((field) => {
      delete resolvedSchema.properties?.[field];
    });

    return { schema: resolvedSchema, definitions };
  }, [definitions, omitFields, schema]);

  return <SchemaContext.Provider value={value}>{children}</SchemaContext.Provider>;
};
