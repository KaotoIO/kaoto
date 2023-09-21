import { Pipe } from '@kaoto-next/camel-catalog/types';
import { isDefined } from '../utils';

/** Very basic check to determine whether this object is a Pipe */
export const isPipe = (rawEntity: unknown): rawEntity is Pipe => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  return (
    typeof rawEntity === 'object' && 'apiVersion' in rawEntity! && 'kind' in rawEntity! && rawEntity.kind == 'Pipe'
  );
};
