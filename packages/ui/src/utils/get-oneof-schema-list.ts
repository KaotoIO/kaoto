import { KaotoSchemaDefinition } from '../models';
import { camelCaseToSpaces } from './camel-case-to-space';
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
  const list = oneOfList
    /** Ignore the `not` schemas */
    .filter((oneOfSchema) => !isDefined(oneOfSchema.not))
    .map((schema, index) => {
      const resolvedSchema = resolveSchemaWithRef(schema, definitions);

      let name = resolvedSchema.title;
      let description = resolvedSchema.description;

      const schemaProps = Object.keys(resolvedSchema.properties ?? {});
      const isSinglePropertySchema = schemaProps.length === 1;
      if (isSinglePropertySchema) {
        const singlePropertySchema = resolveSchemaWithRef(resolvedSchema.properties![schemaProps[0]], definitions);
        name ??= singlePropertySchema.title ?? camelCaseToSpaces(schemaProps[0], { capitalize: true });
        description ??= singlePropertySchema.description;
      }

      name ??= `Schema ${index}`;

      return { name, description, schema: resolvedSchema };
    });

  /** Handling cases where an EIP, Language or Dataformat could be represented in 2 different ways  */
  if (list.length === 2) {
    const [firstSchema, secondSchema] = list;
    if (firstSchema.schema.type === 'string' && secondSchema.schema.type === 'object') {
      firstSchema.name = 'Simple';
      secondSchema.name = 'Advanced';
    }
  }

  return list;
};
