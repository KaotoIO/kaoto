import { CamelYamlDsl, Integration, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';

import { XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';
import { CitrusTestResourceFactory } from '../citrus/citrus-test-resource-factory';
import { Test } from '../citrus/entities/Test';
import { KaotoResource, KaotoResourceSerializer } from '../kaoto-resource';
import { CamelKResourceFactory } from './camel-k-resource-factory';
import { CamelRouteResource } from './camel-route-resource';
import { IKameletDefinition } from './kamelets-catalog';
import { getResourceTypeFromPath } from './source-schema-type';

export class CamelResourceFactory {
  /**
   * Creates a CamelResource based on the given {@link type} and {@link source}. If
   * both are not specified, a default empty {@link CamelRouteResource} is created.
   * If only {@link type} is specified, an empty {@link KaotoResource} of the given
   * {@link type} is created.
   * @param type
   * @param source
   */
  static createCamelResource(source?: string, options: Partial<{ path: string }> = {}): KaotoResource {
    const pathResourceType = getResourceTypeFromPath(options.path);

    const serializer = this.initSerializer(source, options.path);
    const parsedCode = typeof source === 'string' ? serializer.parse(source) : source;

    const testResource = CitrusTestResourceFactory.getCitrusTestResource(parsedCode as Test, pathResourceType);

    if (testResource) return testResource;

    const resource = CamelKResourceFactory.getCamelKResource(
      parsedCode as Integration | KameletBinding | Pipe | IKameletDefinition,
      pathResourceType,
    );

    if (resource) return resource;
    return new CamelRouteResource(parsedCode as CamelYamlDsl, serializer);
  }

  private static initSerializer(source?: string, path?: string): KaotoResourceSerializer {
    if (!path) {
      return XmlCamelResourceSerializer.isApplicable(source)
        ? new XmlCamelResourceSerializer()
        : new YamlCamelResourceSerializer();
    }

    if (path.endsWith('.xml')) {
      return new XmlCamelResourceSerializer();
    }

    return new YamlCamelResourceSerializer();
  }
}
