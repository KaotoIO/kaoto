import { CamelResource, SerializerType, SourceSchemaType } from '../models/camel';

const DSL_LISTS: Record<SerializerType, SourceSchemaType[]> = {
  [SerializerType.YAML]: [SourceSchemaType.RouteYAML, SourceSchemaType.Kamelet, SourceSchemaType.Pipe],
  [SerializerType.XML]: [SourceSchemaType.RouteYAML],
};

export function getSupportedDsls(camelResource: CamelResource) {
  return DSL_LISTS[camelResource.getSerializerType()];
}
