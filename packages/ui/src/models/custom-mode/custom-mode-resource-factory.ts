import { isDefined } from '@kaoto/forms';

import { SourceSchemaType } from '../camel/source-schema-type';
import { KaotoResource } from '../kaoto-resource';
import { CustomModeResource } from './custom-mode-resource';
import { CustomModeFile } from './custom-mode-types';

/**
 * Factory for creating CustomModeResource instances.
 *
 * Detection strategy (mirrors CitrusTestResourceFactory):
 * 1. Explicit SourceSchemaType.CustomMode path hint → always create (Task 5 wires the enum value)
 * 2. JSON root has a `customModes` array → create regardless of path
 */
export class CustomModeResourceFactory {
  static getCustomModeResource(json?: unknown, type?: SourceSchemaType): KaotoResource | undefined {
    if (type === SourceSchemaType.CustomMode) {
      return new CustomModeResource(json as CustomModeFile);
    }

    if (
      isDefined(json) &&
      !Array.isArray(json) &&
      typeof json === 'object' &&
      isDefined((json as Record<string, unknown>).customModes) &&
      Array.isArray((json as Record<string, unknown>).customModes)
    ) {
      return new CustomModeResource(json as CustomModeFile);
    }

    return undefined;
  }
}
