import { RouteDefinition } from '@kaoto/camel-catalog/types';
import { TypeaheadItem } from '@kaoto/forms';
import { useCallback, useMemo } from 'react';

import { EntityType } from '../../../../../models/camel/entities';
import { EntitiesContextResult } from '../../../../../providers/entities.provider';
import { VisibleFlowsContextResult } from '../../../../../providers/visible-flows.provider';

const DIRECT_URI = 'direct';
const DIRECT_URI_PREFIX = `${DIRECT_URI}:`;

interface DirectEndpointEntityLike {
  getId: () => string | undefined;
  toJSON: () => unknown;
}

interface UseDirectEndpointNameOptionsParams {
  value: string;
  onChange: (value: string | undefined) => void;
  visualEntities?: DirectEndpointEntityLike[];
}

interface UseCreateDirectRouteParams {
  disabled: boolean;
  typedName: string;
  existingDirectRouteNames: string[];
  onChange: (value: string | undefined) => void;
  entitiesContext: EntitiesContextResult | null;
  visibleFlowsContext: VisibleFlowsContextResult | undefined;
}

export const getDirectNameFromUri = (uri: string): string | undefined => {
  if (!uri.startsWith(DIRECT_URI_PREFIX)) {
    return undefined;
  }

  const [name] = uri.substring(DIRECT_URI_PREFIX.length).split('?');
  const normalizedName = name.trim();
  return normalizedName === '' ? undefined : normalizedName;
};

const getDirectNameFromEndpointDefinition = (endpointDefinition: unknown): string | undefined => {
  if (typeof endpointDefinition === 'string') {
    return getDirectNameFromUri(endpointDefinition);
  }

  if (!endpointDefinition || typeof endpointDefinition !== 'object' || Array.isArray(endpointDefinition)) {
    return undefined;
  }

  const endpoint = endpointDefinition as Record<string, unknown>;
  const uri = endpoint.uri;
  if (typeof uri !== 'string') {
    return undefined;
  }

  const directNameFromUri = getDirectNameFromUri(uri);
  if (directNameFromUri) {
    return directNameFromUri;
  }

  if (uri !== DIRECT_URI) {
    return undefined;
  }

  const name = (endpoint.parameters as Record<string, unknown> | undefined)?.name;
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : undefined;
};

export const collectDirectEndpointNames = (value: unknown, names: Set<string>) => {
  if (typeof value === 'string') {
    const directName = getDirectNameFromUri(value);
    if (directName) {
      names.add(directName);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectDirectEndpointNames(item, names));
    return;
  }

  const objectValue = value as Record<string, unknown>;
  const uri = objectValue.uri;

  if (typeof uri === 'string') {
    const directNameFromUri = getDirectNameFromUri(uri);
    if (directNameFromUri) {
      names.add(directNameFromUri);
    }

    if (uri === DIRECT_URI) {
      const name = (objectValue.parameters as Record<string, unknown> | undefined)?.name;
      if (typeof name === 'string' && name.trim() !== '') {
        names.add(name.trim());
      }
    }
  }

  Object.values(objectValue).forEach((item) => collectDirectEndpointNames(item, names));
};

const getRouteIdsByDirectName = (visualEntities?: DirectEndpointEntityLike[]) => {
  const routeIdsMap = new Map<string, string[]>();

  visualEntities?.forEach((entity) => {
    const entityDefinition = entity.toJSON() as Record<string, unknown>;
    const routeDefinition = entityDefinition.route as Record<string, unknown> | undefined;
    if (!routeDefinition) {
      return;
    }

    const directName = getDirectNameFromEndpointDefinition(routeDefinition.from);
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
}: UseDirectEndpointNameOptionsParams) => {
  const existingDirectNames = useMemo(() => {
    const names = new Set<string>();
    visualEntities?.forEach((entity) => collectDirectEndpointNames(entity.toJSON(), names));
    return [...names].sort((first, second) => first.localeCompare(second));
  }, [visualEntities]);

  const routeIdsByDirectName = useMemo(() => getRouteIdsByDirectName(visualEntities), [visualEntities]);
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

  const onCleanInput = useCallback(() => onChange(undefined), [onChange]);

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
}: UseCreateDirectRouteParams) => {
  const canCreateRoute = !disabled && typedName !== '' && !existingDirectRouteNames.includes(typedName);

  const onCreateRoute = useCallback(() => {
    if (!entitiesContext || !canCreateRoute) {
      return;
    }

    const routeTemplate: RouteDefinition = {
      from: {
        uri: DIRECT_URI,
        parameters: { name: typedName },
        steps: [],
      },
    };

    const newRouteId = entitiesContext.camelResource.addNewEntity(EntityType.Route, routeTemplate);
    visibleFlowsContext?.visualFlowsApi.toggleFlowVisible(newRouteId);
    entitiesContext.updateEntitiesFromCamelResource();
    onChange(typedName);
  }, [canCreateRoute, entitiesContext, onChange, typedName, visibleFlowsContext]);

  return { canCreateRoute, onCreateRoute };
};
