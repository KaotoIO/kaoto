import { CamelResource, SerializerType, SourceSchemaType } from '../models/camel';

const DSL_LISTS: Record<SerializerType, SourceSchemaType[]> = {
  [SerializerType.YAML]: [
    SourceSchemaType.Route,
    SourceSchemaType.Kamelet,
    SourceSchemaType.Pipe,
    SourceSchemaType.Test,
  ],
  [SerializerType.XML]: [SourceSchemaType.Route],
};

export function getSupportedDsls(camelResource: CamelResource) {
  return DSL_LISTS[camelResource.getSerializerType()];
}
