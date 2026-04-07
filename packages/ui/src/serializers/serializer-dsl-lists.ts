import { SourceSchemaType } from '../models/camel';
import { KaotoResource, SerializerType } from '../models/kaoto-resource';

const DSL_LISTS: Record<SerializerType, SourceSchemaType[]> = {
  [SerializerType.YAML]: [
    SourceSchemaType.Route,
    SourceSchemaType.Kamelet,
    SourceSchemaType.Pipe,
    SourceSchemaType.Test,
  ],
  [SerializerType.XML]: [SourceSchemaType.Route],
};

export function getSupportedDsls(camelResource: KaotoResource) {
  return DSL_LISTS[camelResource.getSerializerType()];
}
