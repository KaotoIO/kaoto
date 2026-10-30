import { isDefined } from '@kaoto/forms';
import { parse } from 'yaml';

import { CITRUS_XML_NAMESPACE } from '../../serializers/xml/citrus-xml-parser';
import { isXML } from '../../serializers/xml/kaoto-xml-parser';
import { SourceSchemaType } from '../camel/source-schema-type';
import { KaotoResource } from '../kaoto-resource';
import { CitrusTestResource } from './citrus-test-resource';
import { CitrusXMLTestResource } from './citrus-xml-test-resource';
import { Test } from './entities/Test';

/**
 * Factory class for creating CitrusTestResource instances.
 *
 * Provides a static method to determine if a given source represents a Citrus test
 * and creates the appropriate CitrusTestResource wrapper.
 */
export class CitrusTestResourceFactory {
  /**
   * Creates a CitrusTestResource from source data if it represents a valid Citrus test.
   *
   * A valid Citrus test is identified by:
   * - Explicit SourceSchemaType.Test or TestXml type parameter, OR
   * - JSON object with a defined 'actions' array property (YAML parsed), OR
   * - XML string source with a TestXml type
   *
   * @param source - The source string or parsed JSON potentially representing a Citrus test
   * @param type - Optional explicit source schema type
   * @returns A CitrusTestResource instance if the input is a valid Citrus test, undefined otherwise
   */
  static getCitrusTestResource(source?: string | Test, type?: SourceSchemaType): KaotoResource | undefined {
    if (SourceSchemaType.TestXml === type) {
      return new CitrusXMLTestResource(typeof source === 'string' ? source : '');
    }

    if (typeof source === 'string' && isXML(source)) {
      if (source.includes(CITRUS_XML_NAMESPACE)) {
        return new CitrusXMLTestResource(source);
      }
      return undefined;
    }

    const json = typeof source === 'string' ? (parse(source) as Test) : source;

    if (SourceSchemaType.Test === type) {
      return new CitrusTestResource(json);
    }

    if (
      isDefined(json) &&
      !Array.isArray(json) &&
      typeof json === 'object' &&
      isDefined(json.actions) &&
      Array.isArray(json.actions)
    ) {
      return new CitrusTestResource(json);
    }

    return undefined;
  }
}
