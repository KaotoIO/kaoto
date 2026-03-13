import { isDefined } from '@kaoto/forms';

import { CamelResource } from '../camel/camel-resource';
import { SourceSchemaType } from '../camel/source-schema-type';
import { CitrusTestResource } from './citrus-test-resource';
import { Test } from './entities/Test';

/**
 * Factory class for creating CitrusTestResource instances.
 *
 * Provides a static method to determine if a given JSON object represents a Citrus test
 * and creates the appropriate CitrusTestResource wrapper.
 */
export class CitrusTestResourceFactory {
  /**
   * Creates a CitrusTestResource from JSON data if it represents a valid Citrus test.
   *
   * A valid Citrus test is identified by:
   * - Explicit SourceSchemaType.Test type parameter, OR
   * - JSON object with a defined 'actions' array property
   *
   * @param json - The JSON object potentially representing a Citrus test
   * @param type - Optional explicit source schema type
   * @returns A CitrusTestResource instance if the input is a valid Citrus test, undefined otherwise
   */
  static getCitrusTestResource(json?: Test, type?: SourceSchemaType): CamelResource | undefined {
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
