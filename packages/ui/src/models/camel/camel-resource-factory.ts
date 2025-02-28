import { CamelYamlDsl, Integration, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';
import { CamelResourceSerializer, XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';
import { IKameletDefinition } from '../kamelets-catalog';
import { CamelKResourceFactory } from './camel-k-resource-factory';
import { CamelResource } from './camel-resource';
import { CamelRouteResource } from './camel-route-resource';
import { getResourceTypeFromPath } from './source-schema-type';

export class CamelResourceFactory {
  /**
   * Creates a CamelResource based on the given {@link type} and {@link source}. If
   * both are not specified, a default empty {@link CamelRouteResource} is created.
   * If only {@link type} is specified, an empty {@link CamelResource} of the given
   * {@link type} is created.
   * @param type
   * @param source
   */
  static createCamelResource(source?: string, options: Partial<{ path: string }> = {}): CamelResource {
    const pathResourceType = getResourceTypeFromPath(options.path);

    const serializer: CamelResourceSerializer = XmlCamelResourceSerializer.isApplicable(source)
      ? new XmlCamelResourceSerializer()
      : new YamlCamelResourceSerializer();

    const parsedCode = typeof source === 'string' ? serializer.parse(source) : source;
    const resource = CamelKResourceFactory.getCamelKResource(
      parsedCode as Integration | KameletBinding | Pipe | IKameletDefinition,
      pathResourceType,
    );

    if (resource) return resource;
    return new CamelRouteResource(parsedCode as CamelYamlDsl, serializer);
  }
}
