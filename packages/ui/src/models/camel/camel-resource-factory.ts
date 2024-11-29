import { SourceSchemaType } from './source-schema-type';
import { CamelResource } from './camel-resource';
import { CamelResourceSerializer, XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';
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
    const serializer: CamelResourceSerializer = XmlCamelResourceSerializer.isApplicable(source)
      ? new XmlCamelResourceSerializer()
      : new YamlCamelResourceSerializer();

    const parsedCode = source ? serializer.parse(source) : source;
    const resource = CamelKResourceFactory.getCamelKResource(parsedCode, type);

    if (resource) return resource;
    return new CamelRouteResource(parsedCode, serializer);
  }
}
