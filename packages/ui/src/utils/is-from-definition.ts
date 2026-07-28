import { FromDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

/** Very basic check to determine whether this object is a From definition */
export const isFromDefinition = (rawEntity: unknown): rawEntity is FromDefinition => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  return 'uri' in rawEntity;
};
