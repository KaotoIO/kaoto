import { AutoForm } from '@kaoto-next/uniforms-patternfly';
import { FunctionComponent, PropsWithChildren, useEffect, useRef, useState } from 'react';
import { SchemaService } from '../components/Form/schema.service';
import { KaotoSchemaDefinition } from '../models/kaoto-schema';
import { SchemaBridgeContext } from '../providers/schema-bridge.provider';

export const UniformsWrapper: FunctionComponent<
  PropsWithChildren<{
    model: Record<string, unknown>;
    schema: KaotoSchemaDefinition['schema'];
  }>
> = (props) => {
  const schemaBridge = new SchemaService().getSchemaBridge(props.schema);
  const divRef = useRef<HTMLDivElement>(null);
  const [, setLastRenderTimestamp] = useState<number>(-1);

  useEffect(() => {
    /** Force re-render to update the divRef */
    setLastRenderTimestamp(Date.now());
  }, []);

  return (
    <SchemaBridgeContext.Provider value={{ schemaBridge, parentRef: divRef }}>
      <AutoForm model={props.model} schema={schemaBridge}>
        {props.children}
      </AutoForm>
      <div ref={divRef} />
    </SchemaBridgeContext.Provider>
  );
};
