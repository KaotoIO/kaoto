import { KaotoSchemaDefinition } from '../models';
import { getResolvedSchema } from './get-resolved-schema';
import { isDefined } from './is-defined';
import { resolveSchemaWithRef } from './resolve-ref-if-needed';

export interface OneOfSchemas {
  name: string;
  description?: string;
  schema: KaotoSchemaDefinition['schema'];
}

export const getOneOfSchemaList = (
  oneOfList: KaotoSchemaDefinition['schema'][],
  rootSchema?: KaotoSchemaDefinition['schema'],
): OneOfSchemas[] => {
  return (
    oneOfList
      /** Ignore the `not` schemas and schemas that are not object */
      .filter((oneOfSchema) => oneOfSchema?.type === 'object')
      .map((oneOfSchema, index) => {
        const resolvedSchema = getResolvedSchema(oneOfSchema, rootSchema);

        let name = resolvedSchema.title;
        let description = resolvedSchema.description;

        const oneOfPropsKeys = Object.keys(resolvedSchema.properties ?? {});
        const isSinglePropertySchema = oneOfPropsKeys.length === 1;
        if (isSinglePropertySchema && !name) {
          name = resolvedSchema.properties![oneOfPropsKeys[0]].title ?? oneOfPropsKeys[0];
        }
        if (isSinglePropertySchema && !description) {
          description = resolvedSchema.properties![oneOfPropsKeys[0]].description;
        }

        name = name ?? `Schema ${index}`;
        description = description ?? resolvedSchema.description;

        return { name, description, schema: resolvedSchema ?? oneOfSchema };
      })
  );
};

export const getOneOfSchemaListV2 = (
  oneOfList: KaotoSchemaDefinition['schema'][],
  definitions: KaotoSchemaDefinition['schema']['definitions'] = {},
): OneOfSchemas[] => {
  return (
    oneOfList
      /** Ignore the `not` schemas */
      .filter((oneOfSchema) => !isDefined(oneOfSchema.not))
      .map((schema, index) => {
        const resolvedSchema = resolveSchemaWithRef(schema, definitions);

        let name = resolvedSchema.title;
        let description = resolvedSchema.description;

        const schemaProps = Object.keys(resolvedSchema.properties ?? {});
        const isSinglePropertySchema = schemaProps.length === 1;
        if (isSinglePropertySchema && !name) {
          name = resolvedSchema.properties![schemaProps[0]].title ?? schemaProps[0];
        }
        if (isSinglePropertySchema && !description) {
          description = resolvedSchema.properties![schemaProps[0]].description;
        }

        name = name ?? `Schema ${index}`;
        description = description ?? resolvedSchema.description;

        return { name, description, schema: resolvedSchema };
      })
  );
};
