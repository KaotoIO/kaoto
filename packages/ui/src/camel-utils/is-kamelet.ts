import { Kamelet } from '@kaoto-next/camel-catalog/types';
import { isDefined } from '../utils';

export const isKamelet = (rawEntity: unknown): rawEntity is Kamelet => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  return (
    typeof rawEntity === 'object' && 'apiVersion' in rawEntity! && 'kind' in rawEntity! && rawEntity.kind == 'Kamelet'
  );
};
