import { CamelYamlDsl, Integration, KameletBinding, Pipe } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';

import { isXML } from '../../serializers/xml/kaoto-xml-parser';
import { parseYamlComments } from '../../utils/yaml-comments';
import { CitrusTestResourceFactory } from '../citrus/citrus-test-resource-factory';
import { Test } from '../citrus/entities/Test';
import { CustomModeResourceFactory } from '../custom-mode/custom-mode-resource-factory';
import { KaotoResource } from '../kaoto-resource';
import { CamelKResourceFactory } from './camel-k-resource-factory';
import { CamelRouteResource } from './camel-route-resource';
import { CamelXMLRouteResource } from './camel-xml-route-resource';
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
    const isXmlSource = options.path ? options.path.toLowerCase().endsWith('.xml') : isXML(source);
    if (isXmlSource) {
      // XML is always a Camel route; entity parsing is deferred to initialize() (post-catalog).
      return new CamelXMLRouteResource(typeof source === 'string' ? source : '');
    }

    const pathResourceType = getResourceTypeFromPath(options.path);
    const comments = source ? parseYamlComments(source) : [];
    const parsedCode = typeof source === 'string' ? parse(source) : source;

    const testResource = CitrusTestResourceFactory.getCitrusTestResource(parsedCode as Test, pathResourceType);
    if (testResource) {
      return testResource;
    }

    const customModeResource = CustomModeResourceFactory.getCustomModeResource(parsedCode, pathResourceType);
    if (customModeResource) {
      return customModeResource;
    }

    const resource = CamelKResourceFactory.getCamelKResource(
      parsedCode as Integration | KameletBinding | Pipe | IKameletDefinition,
      pathResourceType,
    );
    if (resource) {
      return resource;
    }

    return new CamelRouteResource(parsedCode as CamelYamlDsl, comments);
  }
}
