import { FromDefinition, RouteDefinition } from '@kaoto-next/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { isDefined } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';

/** Very basic check to determine whether this object is a Camel Route */
export const isCamelRoute = (rawEntity: unknown): rawEntity is { route: RouteDefinition } => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  const objectKeys = Object.keys(rawEntity!);

  return (
    objectKeys.length === 1 &&
    'route' in rawEntity! &&
    typeof rawEntity.route === 'object' &&
    'from' in rawEntity.route!
  );
};

/** Very basic check to determine whether this object is a Camel From */
export const isCamelFrom = (rawEntity: unknown): rawEntity is { from: FromDefinition } => {
  if (!isDefined(rawEntity) || Array.isArray(rawEntity) || typeof rawEntity !== 'object') {
    return false;
  }

  const objectKeys = Object.keys(rawEntity!);
  const isFromHolder = objectKeys.length === 1 && objectKeys[0] === 'from';
  const isValidUriField = typeof (rawEntity as { from: FromDefinition })?.from?.uri === 'string';
  const isValidStepsArray = Array.isArray((rawEntity as { from: FromDefinition })?.from?.steps);

  return isFromHolder && isValidUriField && isValidStepsArray;
};

export class CamelRouteVisualEntity extends AbstractCamelVisualEntity {
  id: string;
  readonly type = EntityType.Route;

  constructor(public route: RouteDefinition) {
    super(route);
    this.id = route.id ?? getCamelRandomId('route');
    this.route.id = this.id;
  }

  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.route.id = this.id;
  }

  protected getRootUri(): string | undefined {
    return this.route.from?.uri;
  }
}
