import { useMemo } from 'react';
import { useForm } from 'uniforms';
import { KaotoSchemaDefinition } from '../models';
import { ROOT_PATH, getValue } from '../utils';
import { getAppliedSchemaIndex } from '../utils/get-applied-schema-index';
import { OneOfSchemas } from '../utils/get-oneof-schema-list';
import { useSchemaBridgeContext } from './schema-bridge.hook';

interface AppliedSchema {
  index: number;
  name: string;
  description?: string;
  schema: KaotoSchemaDefinition['schema'];
  model: Record<string, unknown>;
}

export const useAppliedSchema = (fieldName: string, oneOfSchemas: OneOfSchemas[]): AppliedSchema | undefined => {
  const form = useForm();
  const { schemaBridge } = useSchemaBridgeContext();

  const result = useMemo(() => {
    const currentModel = getValue(form.model, fieldName === '' ? ROOT_PATH : fieldName);

    const oneOfList = oneOfSchemas.map((oneOf) => oneOf.schema);
    const index = getAppliedSchemaIndex(
      currentModel,
      oneOfList,
      schemaBridge?.schema as KaotoSchemaDefinition['schema'],
    );
    if (index === -1) {
      return undefined;
    }

    const foundSchema = oneOfSchemas[index];
    console.log(JSON.stringify(form.model, null, 2));

    return {
      index,
      name: foundSchema.name,
      description: foundSchema.description,
      schema: foundSchema.schema,
      model: currentModel,
    };
  }, [fieldName, form.model, oneOfSchemas, schemaBridge?.schema]);

  return result;
};
