import { KameletBinding } from '@kaoto-next/camel-catalog/types';
import { isDefined } from '../utils';

/** Very basic check to determine whether this object is a KameletBinding */
export const isKameletBinding = (rawEntity: unknown): rawEntity is KameletBinding => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  return (
    typeof rawEntity === 'object' &&
    'apiVersion' in rawEntity! &&
    'kind' in rawEntity! &&
    rawEntity.kind == 'KameletBinding'
  );
};
