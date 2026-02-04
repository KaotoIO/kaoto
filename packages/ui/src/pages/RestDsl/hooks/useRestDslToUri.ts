import { TypeaheadItem } from '@kaoto/forms';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { EntityType } from '../../../models/camel/entities';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { CamelRouteVisualEntity } from '../../../models/visualization/flows/camel-route-visual-entity';
import { EntitiesContext } from '../../../providers';
import { RestEditorSelection, SelectedFormState, ToUriSchema } from '../restDslTypes';

interface UseRestDslToUriProps {
  selection: RestEditorSelection | undefined;
  selectedFormState: SelectedFormState | undefined;
  restEntities: CamelRestVisualEntity[];
  directEndpointItems: TypeaheadItem<string>[];
  directRouteInputs: Set<string>;
  canAddRestEntities: boolean;
  onChangeProp: (path: string, value: unknown) => void;
}

export const useRestDslToUri = ({
  selection,
  selectedFormState,
  restEntities,
  directEndpointItems,
  directRouteInputs,
  canAddRestEntities,
  onChangeProp,
}: UseRestDslToUriProps) => {
  const entitiesContext = useContext(EntitiesContext);

  const [toUriValue, setToUriValue] = useState('');
  const toUriFieldRef = useRef<HTMLDivElement | null>(null);

  const getOperationToUri = useCallback(
    (selectionValue: RestEditorSelection | undefined) => {
      if (selectionValue?.kind !== 'operation') return '';
      const restEntity = restEntities.find((entity) => entity.id === selectionValue.restId);
      if (!restEntity) return '';
      const restDefinition = restEntity.restDef?.rest ?? {};
      const operations = (restDefinition as Record<string, unknown>)[selectionValue.verb] as
        | Record<string, unknown>[]
        | undefined;
      const selectedOperation = operations?.[selectionValue.index];
      if (!selectedOperation) return '';
      const toValue = (selectedOperation as { to?: unknown }).to;
      if (typeof toValue === 'string') return toValue;
      if (toValue && typeof toValue === 'object') {
        return String((toValue as { uri?: string })?.uri ?? '');
      }
      return '';
    },
    [restEntities],
  );

  const toUriSchema = useMemo<ToUriSchema | undefined>(() => {
    if (selection?.kind !== 'operation' || !selectedFormState) return undefined;
    const schema = selectedFormState.entity.getNodeSchema(selectedFormState.path) as
      | { properties?: Record<string, unknown>; required?: string[] }
      | undefined;
    const toSchema = schema?.properties?.to as
      | { properties?: Record<string, unknown>; required?: string[] }
      | undefined;
    const uriSchema = toSchema?.properties?.uri as
      | { title?: string; description?: string; default?: unknown; type?: string }
      | undefined;
    const isRequired =
      (Array.isArray(schema?.required) && schema?.required.includes('to')) ||
      (Array.isArray(toSchema?.required) && toSchema?.required.includes('uri'));

    return {
      title: uriSchema?.title ?? (toSchema as { title?: string } | undefined)?.title ?? 'To URI',
      description: uriSchema?.description ?? (toSchema as { description?: string } | undefined)?.description,
      defaultValue: uriSchema?.default ?? (toSchema as { default?: unknown } | undefined)?.default,
      required: isRequired,
    };
  }, [selectedFormState, selection]);

  const selectionKey = useMemo(() => {
    if (!selection) return 'none';
    if (selection.kind === 'restConfiguration') return 'restConfiguration';
    if (selection.kind === 'rest') return `rest-${selection.restId}`;
    return `op-${selection.restId}-${selection.verb}-${selection.index}`;
  }, [selection]);

  const lastSelectionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (lastSelectionKeyRef.current === selectionKey) return;
    lastSelectionKeyRef.current = selectionKey;
    setToUriValue(getOperationToUri(selection));
  }, [getOperationToUri, selection, selectionKey]);

  const selectedToUriItem = useMemo<TypeaheadItem<string> | undefined>(() => {
    if (!toUriValue) return undefined;
    return (
      directEndpointItems.find((item) => item.value === toUriValue) ?? {
        name: toUriValue,
        value: toUriValue,
      }
    );
  }, [directEndpointItems, toUriValue]);

  const handleToUriChange = useCallback(
    (item?: TypeaheadItem<string>) => {
      const nextValue = item?.value ?? '';
      setToUriValue(nextValue);
      onChangeProp('to', nextValue || undefined);
    },
    [onChangeProp],
  );

  const handleToUriClear = useCallback(() => {
    setToUriValue('');
    onChangeProp('to', undefined);
  }, [onChangeProp]);

  useEffect(() => {
    if (selection?.kind !== 'operation') return;
    const container = toUriFieldRef.current;
    if (!container) return;
    const input = container.querySelector<HTMLInputElement>(
      '[data-testid="rest-operation-to-uri-typeahead-select-input"]',
    );
    if (!input) return;

    const handleInput = (event: Event) => {
      const target = event.target as HTMLInputElement | null;
      const nextValue = target?.value ?? '';
      setToUriValue(nextValue);
    };

    input.addEventListener('input', handleInput);
    return () => {
      input.removeEventListener('input', handleInput);
    };
  }, [selection]);

  const normalizeRestTargetEndpoint = useCallback((value: string) => {
    if (value.startsWith('direct:')) return value;
    return `direct:${value}`;
  }, []);

  const directRouteExists = useMemo(() => {
    if (!toUriValue) return false;
    const normalized = normalizeRestTargetEndpoint(toUriValue.trim());
    return directRouteInputs.has(normalized);
  }, [directRouteInputs, normalizeRestTargetEndpoint, toUriValue]);

  const handleCreateDirectRoute = useCallback(() => {
    if (!entitiesContext || !canAddRestEntities) return;
    const rawValue = toUriValue?.trim();
    if (!rawValue) return;

    const normalized = normalizeRestTargetEndpoint(rawValue);
    if (!normalized.startsWith('direct:')) return;

    const camelResource = entitiesContext.camelResource as unknown as {
      addNewEntity: (type?: EntityType) => string;
      getVisualEntities: () => Array<{ id: string; type: EntityType }>;
    };

    const newId = camelResource.addNewEntity(EntityType.Route);
    const routeEntity = camelResource
      .getVisualEntities()
      .find((entity) => entity.type === EntityType.Route && entity.id === newId) as CamelRouteVisualEntity | undefined;

    routeEntity?.updateModel('route.from.uri', normalized);
    entitiesContext.updateEntitiesFromCamelResource();
  }, [canAddRestEntities, entitiesContext, normalizeRestTargetEndpoint, toUriValue]);

  return {
    toUriValue,
    setToUriValue,
    toUriFieldRef,
    toUriSchema,
    selectedToUriItem,
    directRouteExists,
    handleToUriChange,
    handleToUriClear,
    handleCreateDirectRoute,
  };
};
