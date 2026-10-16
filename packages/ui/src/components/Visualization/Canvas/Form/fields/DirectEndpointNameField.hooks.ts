import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { TypeaheadItem } from '@kaoto/forms';
import { useCallback, useMemo } from 'react';

import { EntityType } from '../../../../../models/entities';
import { EntitiesContextResult } from '../../../../../providers/entities.provider';
import { VisibleFlowsContextResult } from '../../../../../providers/visible-flows.provider';

const DIRECT_URI = 'direct';

interface DirectEndpointEntityLike {
  getId: () => string | undefined;
  toJSON: () => unknown;
}

interface UseDirectEndpointNameOptionsParams {
  value: string;
  onChange: (value: string | undefined) => void;
  visualEntities?: DirectEndpointEntityLike[];
  /** Component scheme to look up, defaults to `direct` */
  scheme?: string;
}

interface UseCreateDirectRouteParams {
  disabled: boolean;
  typedName: string;
  existingDirectRouteNames: string[];
  onChange: (value: string | undefined) => void;
  entitiesContext: EntitiesContextResult | null;
  visibleFlowsContext: VisibleFlowsContextResult | undefined;
  /** Component scheme used for the created route, defaults to `direct` */
  scheme?: string;
}

export const getDirectNameFromUri = (uri: string, scheme: string = DIRECT_URI): string | undefined => {
  const prefix = `${scheme}:`;
  if (!uri.startsWith(prefix)) {
    return undefined;
  }

  const [name] = uri.substring(prefix.length).split('?');
  const normalizedName = name.trim();
  return normalizedName === '' ? undefined : normalizedName;
};

const getDirectNameFromEndpointDefinition = (endpointDefinition: unknown, scheme: string): string | undefined => {
  if (typeof endpointDefinition === 'string') {
    return getDirectNameFromUri(endpointDefinition, scheme);
  }

  if (!endpointDefinition || typeof endpointDefinition !== 'object' || Array.isArray(endpointDefinition)) {
    return undefined;
  }

  const endpoint = endpointDefinition as Record<string, unknown>;
  const uri = endpoint.uri;
  if (typeof uri !== 'string') {
    return undefined;
  }

  const directNameFromUri = getDirectNameFromUri(uri, scheme);
  if (directNameFromUri) {
    return directNameFromUri;
  }

  if (uri !== scheme) {
    return undefined;
  }

  const name = (endpoint.parameters as Record<string, unknown> | undefined)?.name;
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : undefined;
};

export const collectDirectEndpointNames = (value: unknown, names: Set<string>, scheme: string = DIRECT_URI) => {
  if (typeof value === 'string') {
    const directName = getDirectNameFromUri(value, scheme);
    if (directName) {
      names.add(directName);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      collectDirectEndpointNames(item, names, scheme);
    });
    return;
  }

  const objectValue = value as Record<string, unknown>;
  const uri = objectValue.uri;

  if (typeof uri === 'string') {
    const directNameFromUri = getDirectNameFromUri(uri, scheme);
    if (directNameFromUri) {
      names.add(directNameFromUri);
    }

    if (uri === scheme) {
      const name = (objectValue.parameters as Record<string, unknown> | undefined)?.name;
      if (typeof name === 'string' && name.trim() !== '') {
        names.add(name.trim());
      }
    }
  }

  Object.values(objectValue).forEach((item) => {
    collectDirectEndpointNames(item, names, scheme);
  });
};

const getRouteIdsByDirectName = (visualEntities: DirectEndpointEntityLike[] | undefined, scheme: string) => {
  const routeIdsMap = new Map<string, string[]>();

  visualEntities?.forEach((entity) => {
    const entityDefinition = entity.toJSON() as Record<string, unknown>;
    const routeDefinition = entityDefinition.route as Record<string, unknown> | undefined;
    if (!routeDefinition) {
      return;
    }

    const directName = getDirectNameFromEndpointDefinition(routeDefinition.from, scheme);
    if (!directName) {
      return;
    }

    const routeId = entity.getId();
    if (!routeId) {
      return;
    }

    const routeIds = routeIdsMap.get(directName) ?? [];
    if (!routeIds.includes(routeId)) {
      routeIds.push(routeId);
      routeIdsMap.set(directName, routeIds);
    }
  });

  return routeIdsMap;
};

export const useDirectEndpointNameOptions = ({
  value,
  onChange,
  visualEntities,
  scheme = DIRECT_URI,
}: UseDirectEndpointNameOptionsParams) => {
  const existingDirectNames = useMemo(() => {
    const names = new Set<string>();
    visualEntities?.forEach((entity) => {
      collectDirectEndpointNames(entity.toJSON(), names, scheme);
    });
    return [...names].sort((first, second) => first.localeCompare(second));
  }, [scheme, visualEntities]);

  const routeIdsByDirectName = useMemo(() => getRouteIdsByDirectName(visualEntities, scheme), [scheme, visualEntities]);
  const existingDirectRouteNames = useMemo(
    () => [...routeIdsByDirectName.keys()].sort((first, second) => first.localeCompare(second)),
    [routeIdsByDirectName],
  );

  const items = useMemo<TypeaheadItem<string>[]>(() => {
    return existingDirectNames.map((name) => {
      const routeIds = routeIdsByDirectName.get(name) ?? [];
      return {
        name,
        value: name,
        description: routeIds.length > 0 ? routeIds.join(', ') : '',
      };
    });
  }, [existingDirectNames, routeIdsByDirectName]);

  const selectedItem = useMemo(() => {
    if (!value) {
      return undefined;
    }

    return items.find((item) => item.name === value) ?? { name: value, value, description: '' };
  }, [items, value]);

  const typedName = value.trim();

  const onTypeaheadChange = useCallback(
    (item?: TypeaheadItem<string>) => {
      onChange(item?.name?.trim() ? item.name : undefined);
    },
    [onChange],
  );

  const onCleanInput = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const onCreateOption = useCallback(
    (_value?: string, filterValue?: string) => {
      onChange(filterValue?.trim() ? filterValue : undefined);
    },
    [onChange],
  );

  return {
    existingDirectNames,
    existingDirectRouteNames,
    items,
    selectedItem,
    typedName,
    onTypeaheadChange,
    onCleanInput,
    onCreateOption,
  };
};

export const useCreateDirectRoute = ({
  disabled,
  typedName,
  existingDirectRouteNames,
  onChange,
  entitiesContext,
  visibleFlowsContext,
  scheme = DIRECT_URI,
}: UseCreateDirectRouteParams) => {
  const canCreateRoute = !disabled && typedName !== '' && !existingDirectRouteNames.includes(typedName);

  const onCreateRoute = useCallback(() => {
    if (!entitiesContext || !canCreateRoute) {
      return;
    }

    const routeTemplate: RouteDefinition = {
      from: {
        uri: scheme,
        parameters: { name: typedName },
        steps: [],
      },
    };

    const newRouteId = entitiesContext.camelResource.addNewEntity(EntityType.Route, routeTemplate);
    visibleFlowsContext?.visualFlowsApi.toggleFlowVisible(newRouteId);
    entitiesContext.updateEntitiesFromCamelResource();
    onChange(typedName);
  }, [canCreateRoute, entitiesContext, onChange, scheme, typedName, visibleFlowsContext]);

  return { canCreateRoute, onCreateRoute };
};
