import { TypeaheadItem } from '@kaoto/forms';

import { EntityType } from '../../../models/camel/entities';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows/camel-route-visual-entity';
import { getValue } from '../../../utils';
import { RestEditorSelection } from '../restDslTypes';

/**
 * Checks if a URI is an allowed REST target endpoint
 */
export const isAllowedRestTargetEndpoint = (uri: string): boolean => {
  return uri.startsWith('direct:');
};

/**
 * Collects direct endpoint URIs from visual entities
 */
export const collectDirectEndpoints = (visualEntities: BaseVisualCamelEntity[]): TypeaheadItem<string>[] => {
  const endpoints = new Set<string>();
  const visited = new WeakSet<Record<string, unknown>>();

  const collectDirectEndpoint = (value: Record<string, unknown>) => {
    const idValue = getValue(value, 'id');
    if (typeof idValue === 'string') {
      endpoints.add(`direct:${idValue}`);
    }
  };

  const addEndpointIfAllowed = (value: string) => {
    if (isAllowedRestTargetEndpoint(value)) {
      endpoints.add(value);
    }
  };

  const collectUriValue = (value: Record<string, unknown>) => {
    const uriValue = getValue(value, 'uri');
    if (typeof uriValue !== 'string') return;
    if (isAllowedRestTargetEndpoint(uriValue)) {
      endpoints.add(uriValue);
      return;
    }
    if (uriValue === 'direct') {
      collectDirectEndpoint(value);
    }
  };

  const collectObject = (value: Record<string, unknown>) => {
    if (visited.has(value)) return;
    visited.add(value);
    collectUriValue(value);
    Object.values(value).forEach((item) => collect(item));
  };

  const collect = (value: unknown) => {
    if (!value) return;
    if (typeof value === 'string') {
      addEndpointIfAllowed(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => collect(item));
      return;
    }
    if (typeof value === 'object') {
      collectObject(value as Record<string, unknown>);
    }
  };

  visualEntities.forEach((entity) => {
    if (entity.type === EntityType.Route) {
      const routeEntity = entity as CamelRouteVisualEntity;
      collect(routeEntity.entityDef);
      return;
    }
    collect((entity as unknown as { entityDef?: unknown }).entityDef ?? entity);
  });

  return Array.from(endpoints)
    .sort((a, b) => a.localeCompare(b))
    .map((uri) => ({ name: uri, value: uri }));
};

/**
 * Collects direct route input URIs from route entities
 */
export const collectDirectRouteInputs = (visualEntities: BaseVisualCamelEntity[]): Set<string> => {
  const inputs = new Set<string>();

  visualEntities.forEach((entity) => {
    if (entity.type !== EntityType.Route) return;
    const routeEntity = entity as CamelRouteVisualEntity;
    const fromUri = getValue(routeEntity.entityDef, 'route.from.uri');
    if (typeof fromUri === 'string' && fromUri.startsWith('direct:')) {
      inputs.add(fromUri);
    }
  });

  return inputs;
};

/**
 * Generates a CSS class name for a navigation list item based on selection state
 */
export const getListItemClass = (selection: RestEditorSelection | undefined, target: RestEditorSelection): string => {
  const isSelected =
    selection?.kind === target.kind &&
    (target.kind === 'restConfiguration' ||
      (selection?.kind !== 'restConfiguration' &&
        selection?.restId === (target as { restId?: string }).restId &&
        (target.kind !== 'operation' ||
          (selection?.kind === 'operation' && selection.verb === target.verb && selection.index === target.index))));

  return `rest-dsl-nav-item${isSelected ? ' rest-dsl-nav-item-selected' : ''}`;
};

/**
 * Normalizes a REST target endpoint to ensure it has the 'direct:' prefix
 */
export const normalizeRestTargetEndpoint = (value: string): string => {
  if (value.startsWith('direct:')) return value;
  return `direct:${value}`;
};
