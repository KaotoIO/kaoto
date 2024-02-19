import { FunctionComponent, PropsWithChildren, createContext, useMemo } from 'react';
import { JSONSchemaBridge as SchemaBridge } from 'uniforms-bridge-json-schema';
import { SchemaService } from '../components/Form/schema.service';
import { KaotoSchemaDefinition } from '../models/kaoto-schema';

interface SchemaBridgeProviderProps {
  schema: KaotoSchemaDefinition['schema'] | undefined;
}

export const SchemaBridgeContext = createContext<SchemaBridge | undefined>(undefined);

export const SchemaBridgeProvider: FunctionComponent<PropsWithChildren<SchemaBridgeProviderProps>> = (props) => {
  const schemaBridge = useMemo(() => {
    const schemaService = new SchemaService();
    const schemaBridge = schemaService.getSchemaBridge(props.schema);

    return schemaBridge;
  }, [props.schema]);

  return <SchemaBridgeContext.Provider value={schemaBridge}>{props.children}</SchemaBridgeContext.Provider>;
};
