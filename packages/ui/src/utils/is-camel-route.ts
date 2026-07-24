import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

/** Very basic check to determine whether this object is a Camel Route */
export const isCamelRoute = (rawEntity: unknown): rawEntity is { route: RouteDefinition } => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  const objectKeys = Object.keys(rawEntity);

  return (
    objectKeys.length === 1 &&
    'route' in rawEntity &&
    typeof rawEntity.route === 'object' &&
    isDefined(rawEntity.route) &&
    'from' in rawEntity.route
  );
};
