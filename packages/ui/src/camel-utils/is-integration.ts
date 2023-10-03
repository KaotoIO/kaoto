import { Integration } from '@kaoto-next/camel-catalog/types';
import { isDefined } from '../utils';

export const isIntegration = (rawEntity: unknown): rawEntity is Integration => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  return (
    typeof rawEntity === 'object' &&
    'apiVersion' in rawEntity! &&
    'kind' in rawEntity! &&
    rawEntity.kind == 'Integration'
  );
};
