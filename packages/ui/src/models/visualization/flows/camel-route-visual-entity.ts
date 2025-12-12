import { FromDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { setValue } from '../../../utils';
import { EntityType } from '../../camel/entities';
import { DefinedComponent } from '../../camel-catalog-index';
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

export class CamelRouteVisualEntity extends AbstractCamelVisualEntity<{ route: RouteDefinition }> {
  id: string;
  readonly type = EntityType.Route;
  static readonly ROOT_PATH = 'route';

  constructor(routeRaw: { route: RouteDefinition } | { from: FromDefinition } | undefined) {
    let routeDef: { route: RouteDefinition };
    let routeRawId: string | undefined;
    if (isCamelFrom(routeRaw)) {
      routeDef = getDefaultRouteDefinition(routeRaw);
      routeRawId = routeRaw.from.id;
    } else if (isCamelRoute(routeRaw)) {
      routeDef = routeRaw;
      routeRawId = routeRaw.route?.id;
    } else {
      routeDef = getDefaultRouteDefinition();
    }

    super(routeDef);
    const id = routeRawId ?? getCamelRandomId('route');
    this.id = id;
    this.entityDef.route.id = this.id;
  }

  static isApplicable(routeDef: unknown): routeDef is { route: RouteDefinition } | { from: FromDefinition } {
    return isCamelRoute(routeDef) || isCamelFrom(routeDef);
  }

  getRootPath(): string {
    return CamelRouteVisualEntity.ROOT_PATH;
  }

  /** Internal API methods */
  setId(routeId: string): void {
    this.id = routeId;
    this.entityDef.route.id = this.id;
  }

  toJSON(): { route: RouteDefinition } {
    return { route: this.entityDef.route };
  }

  addStep(options: {
    definedComponent: DefinedComponent;
    mode: AddStepMode;
    data: IVisualizationNodeData;
    targetProperty?: string | undefined;
  }): void {
    /** Replace the root `from` step */
    if (
      options.mode === AddStepMode.ReplaceStep &&
      options.data.path === `${this.getRootPath()}.from` &&
      isDefined(this.entityDef.route.from)
    ) {
      const fromValue = CamelComponentDefaultService.getDefaultFromDefinitionValue(options.definedComponent);
      Object.assign(this.entityDef.route.from, fromValue);
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
    if (path === `${this.getRootPath()}.from`) {
      setValue(this.entityDef, `${this.getRootPath()}.from.uri`, '');
      return;
    }

    super.removeStep(path);
  }

  updateModel(path: string | undefined, value: unknown): void {
    super.updateModel(path, value);
    if (isDefined(this.entityDef.route.id)) this.id = this.entityDef.route.id;
  }

  protected getRootUri(): string | undefined {
    return this.entityDef.route.from?.uri;
  }

  getGroupIcons(): { icon: 'play' | 'pause'; title: string }[] {
    const isAutoStartup = this.entityDef.route.autoStartup !== false;

    return [
      {
        icon: isAutoStartup ? 'play' : 'pause',
        title: isAutoStartup ? 'Auto Startup Enabled' : 'Auto Startup Disabled',
      },
    ];
  }
}
