import { SourceSchemaType } from './source-schema-type';
import { CamelResource } from './camel-resource';
import { XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';
import { CamelRouteResource } from './camel-route-resource';
import { CamelKResourceFactory } from './camel-k-resource-factory';

export class CamelResourceFactory {
  /**
   * Creates a CamelResource based on the given {@link type} and {@link source}. If
   * both are not specified, a default empty {@link CamelRouteResource} is created.
   * If only {@link type} is specified, an empty {@link CamelResource} of the given
   * {@link type} is created.
   * @param type
   * @param source
   */
  static createCamelResource(source?: string, type?: SourceSchemaType): CamelResource {
    if (XmlCamelResourceSerializer.isApplicable(source)) {
      return new CamelRouteResource(source, new XmlCamelResourceSerializer());
    }

    const serializer = new YamlCamelResourceSerializer();
    const resource = CamelKResourceFactory.getCamelKResource(serializer.parse(source ?? ''), type);

    if (resource) return resource;
    return new CamelRouteResource(source, serializer);
  }
}
