import { FromDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { isDefined, setValue } from '../../../utils';
import { DefinedComponent } from '../../camel-catalog-index';
import { EntityType } from '../../camel/entities';
import { AddStepMode, IVisualizationNodeData } from '../base-visual-entity';
import { AbstractCamelVisualEntity } from './abstract-camel-visual-entity';
import { CamelComponentDefaultService } from './support/camel-component-default.service';

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

  return isFromHolder && isValidUriField;
};

const getDefaultRouteDefinition = (fromDefinition?: { from: FromDefinition }): { route: RouteDefinition } => ({
  route: {
    from: fromDefinition?.from ?? {
      uri: '',
      steps: [],
    },
  },
});

export class CamelRouteVisualEntity extends AbstractCamelVisualEntity<RouteDefinition> {
  id: string;
  route: RouteDefinition;
  readonly type = EntityType.Route;

  constructor(routeRaw: { route: RouteDefinition } | { from: FromDefinition } | undefined) {
    let route: RouteDefinition;
    let routeRawId: string | undefined;
    if (isCamelFrom(routeRaw)) {
      route = getDefaultRouteDefinition(routeRaw).route;
      routeRawId = routeRaw.from.id;
    } else if (isCamelRoute(routeRaw)) {
      route = routeRaw.route;
      routeRawId = routeRaw.route?.id;
    } else {
      route = getDefaultRouteDefinition().route;
    }

    super(route);
    this.route = route;
    const id = routeRawId ?? getCamelRandomId('route');
    this.id = id;
    this.route.id = this.id;
  }

  static isApplicable(routeDef: unknown): routeDef is { route: RouteDefinition } | { from: FromDefinition } {
    return isCamelRoute(routeDef) || isCamelFrom(routeDef);
  }

  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.route.id = this.id;
  }

  toJSON(): { route: RouteDefinition } {
    return { route: this.route };
  }

  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string | undefined;
  }): void {
    /** Replace the root `from` step */
    if (options.mode === AddStepMode.ReplaceStep && options.data.path === 'from' && isDefined(this.route.from)) {
      const fromValue = CamelComponentDefaultService.getDefaultFromDefinitionValue(options.definedComponent);
      Object.assign(this.route.from, fromValue);
      return;
    }

    super.addStep(options);
  }

  removeStep(path?: string): void {
    if (!path) return;
    /**
     * If there's only one path segment, it means the target is the `from` property of the route
     * therefore we replace it with an empty object
     */
    if (path === 'from') {
      setValue(this.route, 'from.uri', '');
      return;
    }

    super.removeStep(path);
  }

  updateModel(path: string | undefined, value: unknown): void {
    super.updateModel(path, value);
    if (isDefined(this.route.id)) this.id = this.route.id;
  }

  protected getRootUri(): string | undefined {
    return this.route.from?.uri;
  }
}
