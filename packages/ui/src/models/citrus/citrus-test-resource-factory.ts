import { isDefined } from '@kaoto/forms';

import { CamelResource } from '../camel/camel-resource';
import { SourceSchemaType } from '../camel/source-schema-type';
import { CitrusTestResource } from './citrus-test-resource';
import { Test } from './entities/Test';

export class CitrusTestResourceFactory {
  static getCitrusTestResource(json?: Test, type?: SourceSchemaType): CamelResource | undefined {
    if (SourceSchemaType.Test == type) {
      return new CitrusTestResource(json);
    }

    if (!isDefined(json) || Array.isArray(json) || typeof json !== 'object' || !isDefined(json.actions)) {
      return undefined;
    }

    return new CitrusTestResource(json);
  }
}
