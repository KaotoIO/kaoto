import './RestDslPage.scss';

import { CanvasFormTabsContextResult, TypeaheadItem } from '@kaoto/forms';
import {
  Button,
  Form,
  FormGroup,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Popover,
  Select,
  SelectList,
  SelectOption,
  Split,
  TextInput,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { useLocalStorage } from '../../hooks';
import { useRuntimeContext } from '../../hooks/useRuntimeContext/useRuntimeContext';
import { EntityType } from '../../models/camel/entities';
import { CatalogKind } from '../../models/catalog-kind';
import { LocalStorageKeys } from '../../models/local-storage-keys';
import { REST_DSL_VERBS } from '../../models/special-processors.constants';
import { CamelCatalogService } from '../../models/visualization/flows/camel-catalog.service';
import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows/camel-route-visual-entity';
import { EntitiesContext } from '../../providers';
import {
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
  ActionConfirmationModalContextProvider,
} from '../../providers/action-confirmation-modal.provider';
import { getValue, setValue } from '../../utils';
import { RestDslDetails } from './RestDslDetails';
import { RestDslNav } from './RestDslNav';
import { RestEditorSelection, RestVerb } from './restDslTypes';

type OperationVerbToggleProps = {
  toggleRef: React.Ref<HTMLButtonElement>;
  operationVerb: RestVerb;
  onToggle: () => void;
};

const OperationVerbToggle: FunctionComponent<OperationVerbToggleProps> = ({ toggleRef, operationVerb, onToggle }) => {
  return (
    <MenuToggle ref={toggleRef} onClick={onToggle}>
      {operationVerb.toUpperCase()}
    </MenuToggle>
  );
};

const createOperationVerbToggleRenderer =
  (operationVerb: RestVerb, onToggle: () => void) => (toggleRef: React.Ref<HTMLButtonElement>) => (
    <OperationVerbToggle toggleRef={toggleRef} operationVerb={operationVerb} onToggle={onToggle} />
  );

const OperationTypeHelp: FunctionComponent = () => (
  <Popover
    bodyContent="Select the HTTP method to create for this REST operation."
    triggerAction="hover"
    withFocusTrap={false}
  >
    <Button variant="plain" aria-label="More info about Operation Type" icon={<HelpIcon />} />
  </Popover>
);

type OperationVerbSelectProps = {
  isOpen: boolean;
  selected: RestVerb;
  verbs: RestVerb[];
  onSelect: (value: RestVerb) => void;
  onOpenChange: (isOpen: boolean) => void;
  onToggle: () => void;
};

const OperationVerbSelect: FunctionComponent<OperationVerbSelectProps> = ({
  isOpen,
  selected,
  verbs,
  onSelect,
  onOpenChange,
  onToggle,
}) => {
  const toggleRenderer = useMemo(() => createOperationVerbToggleRenderer(selected, onToggle), [selected, onToggle]);

  return (
    <Select
      isOpen={isOpen}
      selected={selected}
      onSelect={(_event, value) => onSelect(value as RestVerb)}
      onOpenChange={onOpenChange}
      toggle={toggleRenderer}
    >
      <SelectList>
        {verbs.map((verb) => (
          <SelectOption key={verb} itemId={verb}>
            {verb.toUpperCase()}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

const REST_METHODS = REST_DSL_VERBS;
const NAV_MIN_WIDTH = 220;
const DETAILS_MIN_WIDTH = 420;
const ALLOWED_REST_TARGET_ENDPOINTS = ['direct:'] as const;

export const RestDslPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
  const actionConfirmation = useContext(ActionConfirmationModalContext);
  const { selectedCatalog } = useRuntimeContext();
  const catalogKey = selectedCatalog?.version ?? selectedCatalog?.name ?? 'default';

  const restConfiguration = useMemo(() => {
    return entitiesContext?.visualEntities.find((entity) => entity.type === EntityType.RestConfiguration) as
      | CamelRestConfigurationVisualEntity
      | undefined;
  }, [entitiesContext?.visualEntities]);

  const restEntities = useMemo(() => {
    return (entitiesContext?.visualEntities ?? []).filter(
      (entity) => entity.type === EntityType.Rest,
    ) as CamelRestVisualEntity[];
  }, [entitiesContext?.visualEntities]);

  const directRouteInputs = useMemo(() => {
    const inputs = new Set<string>();
    (entitiesContext?.visualEntities ?? []).forEach((entity) => {
      if (entity.type !== EntityType.Route) return;
      const routeEntity = entity as CamelRouteVisualEntity;
      const uri = routeEntity.entityDef?.route?.from?.uri;
      if (typeof uri === 'string' && uri.startsWith('direct:')) {
        inputs.add(uri);
      }
    });
    return inputs;
  }, [entitiesContext?.visualEntities]);

  const directEndpointItems = useMemo<TypeaheadItem<string>[]>(() => {
    const endpoints = new Set<string>();
    const visited = new WeakSet<object>();
    const isAllowedRestTargetEndpoint = (uri: string) =>
      ALLOWED_REST_TARGET_ENDPOINTS.some((scheme) => uri.startsWith(scheme));

    const addEndpointIfAllowed = (uri: string) => {
      if (isAllowedRestTargetEndpoint(uri)) {
        endpoints.add(uri);
      }
    };

    const collectDirectEndpoint = (value: Record<string, unknown>) => {
      const directName = getValue(value, 'parameters.name');
      if (typeof directName === 'string' && directName.trim()) {
        endpoints.add(`direct:${directName.trim()}`);
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

    (entitiesContext?.visualEntities ?? []).forEach((entity) => {
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
  }, [entitiesContext?.visualEntities]);

  const canAddRestEntities = useMemo(() => {
    return Boolean(entitiesContext?.camelResource && 'addNewEntity' in entitiesContext.camelResource);
  }, [entitiesContext?.camelResource]);

  const canDeleteRestEntities = useMemo(() => {
    return Boolean(entitiesContext?.camelResource && 'removeEntity' in entitiesContext.camelResource);
  }, [entitiesContext?.camelResource]);

  const defaultSelection = useMemo<RestEditorSelection | undefined>(() => {
    if (restConfiguration) return { kind: 'restConfiguration' };
    const firstRest = restEntities[0];
    if (firstRest) return { kind: 'rest', restId: firstRest.id };
    return undefined;
  }, [restConfiguration, restEntities]);

  const [selection, setSelection] = useState<RestEditorSelection | undefined>(defaultSelection);
  const [navWidth, setNavWidth] = useLocalStorage(LocalStorageKeys.RestDslNavWidth, 288);
  const resizeRef = useRef<{ startX: number; startWidth: number; isDragging: boolean } | null>(null);
  const [isAddOperationOpen, setIsAddOperationOpen] = useState(false);
  const [addOperationRestId, setAddOperationRestId] = useState<string | undefined>(undefined);
  const [operationId, setOperationId] = useState('');
  const [operationPath, setOperationPath] = useState('');
  const [operationVerb, setOperationVerb] = useState<RestVerb>('get');
  const [isVerbSelectOpen, setIsVerbSelectOpen] = useState(false);
  const [toUriValue, setToUriValue] = useState('');
  const toUriFieldRef = useRef<HTMLDivElement | null>(null);
  const uriInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!selection) {
      setSelection(defaultSelection);
      return;
    }

    if (selection.kind === 'restConfiguration' && !restConfiguration) {
      setSelection(defaultSelection);
      return;
    }

    if (selection.kind !== 'restConfiguration') {
      const restEntity = restEntities.find((entity) => entity.id === selection.restId);
      if (!restEntity) {
        setSelection(defaultSelection);
      }
    }
  }, [defaultSelection, restConfiguration, restEntities, selection]);

  const selectedFormState = useMemo(() => {
    if (!selection) return undefined;

    if (selection.kind === 'restConfiguration') {
      if (!restConfiguration) return undefined;
      return {
        title: 'Rest Configuration',
        entity: restConfiguration,
        path: restConfiguration.getRootPath(),
        omitFields: restConfiguration.getOmitFormFields(),
      };
    }

    const restEntity = restEntities.find((entity) => entity.id === selection.restId);
    if (!restEntity) return undefined;

    if (selection.kind === 'rest') {
      return {
        title: 'Rest',
        entity: restEntity,
        path: restEntity.getRootPath(),
        omitFields: restEntity.getOmitFormFields(),
      };
    }

    const operationPath = `${restEntity.getRootPath()}.${selection.verb}.${selection.index}`;
    return {
      title: `${selection.verb.toUpperCase()} Operation`,
      entity: restEntity,
      path: operationPath,
      omitFields: ['to'],
    };
  }, [restConfiguration, restEntities, selection]);

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

  const toUriSchema = useMemo(() => {
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

  const formTabsValue: CanvasFormTabsContextResult = useMemo(
    () => ({
      selectedTab: 'All',
      setSelectedTab: () => {},
    }),
    [],
  );

  const handleOnChangeProp = useCallback(
    (path: string, value: unknown) => {
      if (!selectedFormState || !entitiesContext) return;

      let updatedValue = value;
      if (typeof value === 'string' && value.trim() === '') {
        updatedValue = undefined;
      }

      const newModel = selectedFormState.entity.getNodeDefinition(selectedFormState.path) ?? {};
      setValue(newModel, path, updatedValue);
      selectedFormState.entity.updateModel(selectedFormState.path, newModel);
      entitiesContext.updateSourceCodeFromEntities();
    },
    [entitiesContext, selectedFormState],
  );

  const handleToUriChange = useCallback(
    (item?: TypeaheadItem<string>) => {
      const nextValue = item?.value ?? '';
      setToUriValue(nextValue);
      handleOnChangeProp('to', nextValue || undefined);
    },
    [handleOnChangeProp],
  );

  const handleToUriClear = useCallback(() => {
    setToUriValue('');
    handleOnChangeProp('to', undefined);
  }, [handleOnChangeProp]);

  const handleSelectOperation = useCallback((restId: string, verb: RestVerb, index: number) => {
    setSelection({ kind: 'operation', restId, verb, index });
  }, []);

  const handleSelectRestConfiguration = useCallback(() => {
    setSelection({ kind: 'restConfiguration' });
  }, []);

  const handleSelectRest = useCallback((restId: string) => {
    setSelection({ kind: 'rest', restId });
  }, []);

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

  const handleCreateRestConfiguration = useCallback(() => {
    if (!entitiesContext || !canAddRestEntities || restConfiguration) return;

    const camelResource = entitiesContext.camelResource as { addNewEntity: (type?: EntityType) => string };
    camelResource.addNewEntity(EntityType.RestConfiguration);
    entitiesContext.updateEntitiesFromCamelResource();
    setSelection({ kind: 'restConfiguration' });
  }, [canAddRestEntities, entitiesContext, restConfiguration]);

  const handleCreateRest = useCallback(() => {
    if (!entitiesContext || !canAddRestEntities) return;

    const camelResource = entitiesContext.camelResource as { addNewEntity: (type?: EntityType) => string };
    const newId = camelResource.addNewEntity(EntityType.Rest);
    entitiesContext.updateEntitiesFromCamelResource();
    if (newId) {
      setSelection({ kind: 'rest', restId: newId });
    }
  }, [canAddRestEntities, entitiesContext]);

  const openAddOperationModal = useCallback(
    (restId: string) => {
      setAddOperationRestId(restId);
      setOperationVerb('get');
      setOperationId(getCamelRandomId('rest'));
      setOperationPath('');
      setIsAddOperationOpen(true);
      requestAnimationFrame(() => {
        uriInputRef.current?.focus();
      });
    },
    [setIsAddOperationOpen],
  );

  const closeAddOperationModal = useCallback(() => {
    setIsAddOperationOpen(false);
    setAddOperationRestId(undefined);
  }, []);

  const handleVerbToggle = useCallback(() => {
    setIsVerbSelectOpen((prev) => !prev);
  }, []);

  const handleCreateOperation = useCallback(() => {
    if (!entitiesContext || !addOperationRestId) return;
    const restEntity = restEntities.find((entity) => entity.id === addOperationRestId);
    if (!restEntity) return;

    const restDefinition = restEntity.restDef.rest ?? {};
    const operations = (restDefinition as Record<string, unknown>)[operationVerb] as
      | Record<string, unknown>[]
      | undefined;
    const normalizedOperations = operations ? [...operations] : [];
    const resolvedId = operationId.trim() || getCamelRandomId(operationVerb);

    normalizedOperations.push({
      id: resolvedId,
      path: operationPath.trim() || '/',
      to: {
        uri: `direct:${resolvedId}`,
      },
    });

    (restDefinition as Record<string, unknown>)[operationVerb] = normalizedOperations;
    restEntity.updateModel(restEntity.getRootPath(), restDefinition);
    entitiesContext.updateEntitiesFromCamelResource();

    setSelection({
      kind: 'operation',
      restId: addOperationRestId,
      verb: operationVerb,
      index: normalizedOperations.length - 1,
    });
    closeAddOperationModal();
  }, [
    addOperationRestId,
    closeAddOperationModal,
    entitiesContext,
    operationId,
    operationPath,
    operationVerb,
    restEntities,
  ]);

  const confirmDelete = useCallback(
    async (title: string, text: string) => {
      if (!actionConfirmation) {
        return globalThis.confirm(text);
      }

      const result = await actionConfirmation.actionConfirmation({
        title,
        text,
      });
      return result === ACTION_ID_CONFIRM;
    },
    [actionConfirmation],
  );

  const handleDeleteRestConfiguration = useCallback(async () => {
    if (!entitiesContext || !restConfiguration || !canDeleteRestEntities) return;
    const shouldDelete = await confirmDelete('Delete Rest Configuration', 'This will remove the Rest Configuration.');
    if (!shouldDelete) return;

    const camelResource = entitiesContext.camelResource as { removeEntity: (ids?: string[]) => void };
    camelResource.removeEntity([restConfiguration.id]);
    entitiesContext.updateEntitiesFromCamelResource();
    setSelection(undefined);
  }, [canDeleteRestEntities, confirmDelete, entitiesContext, restConfiguration]);

  const handleDeleteRest = useCallback(
    async (restEntity: CamelRestVisualEntity) => {
      if (!entitiesContext || !canDeleteRestEntities) return;
      const label = restEntity.restDef?.rest?.path || restEntity.id;
      const shouldDelete = await confirmDelete('Delete Rest Element', `This will remove ${label}.`);
      if (!shouldDelete) return;

      const camelResource = entitiesContext.camelResource as { removeEntity: (ids?: string[]) => void };
      camelResource.removeEntity([restEntity.id]);
      entitiesContext.updateEntitiesFromCamelResource();
      setSelection(undefined);
    },
    [canDeleteRestEntities, confirmDelete, entitiesContext],
  );

  const handleDeleteOperation = useCallback(
    async (restEntity: CamelRestVisualEntity, verb: RestVerb, index: number) => {
      if (!entitiesContext) return;
      const restDefinition = restEntity.restDef.rest ?? {};
      const operations = (restDefinition as Record<string, unknown>)[verb] as Record<string, unknown>[] | undefined;
      if (!operations?.[index]) return;
      const pathLabel = (operations[index] as { path?: string }).path ?? '';
      const shouldDelete = await confirmDelete(
        'Delete Operation',
        `This will remove ${verb.toUpperCase()} ${pathLabel || ''}.`,
      );
      if (!shouldDelete) return;

      const updated = operations.filter((_operation, idx) => idx !== index);
      if (updated.length === 0) {
        delete (restDefinition as Record<string, unknown>)[verb];
      } else {
        (restDefinition as Record<string, unknown>)[verb] = updated;
      }

      restEntity.updateModel(restEntity.getRootPath(), restDefinition);
      entitiesContext.updateEntitiesFromCamelResource();
      setSelection({ kind: 'rest', restId: restEntity.id });
    },
    [confirmDelete, entitiesContext],
  );

  const handleResizeStart = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      resizeRef.current = {
        startX: event.clientX,
        startWidth: navWidth,
        isDragging: true,
      };
      event.preventDefault();
    },
    [navWidth],
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeRef.current?.isDragging) return;
      const delta = event.clientX - resizeRef.current.startX;
      const nextWidth = resizeRef.current.startWidth + delta;
      const maxNavWidth = Math.max(NAV_MIN_WIDTH, (globalThis.innerWidth || 0) - DETAILS_MIN_WIDTH);
      const clamped = Math.max(NAV_MIN_WIDTH, Math.min(maxNavWidth, nextWidth));
      setNavWidth(clamped);
    };

    const handleMouseUp = () => {
      if (resizeRef.current) {
        resizeRef.current.isDragging = false;
      }
    };

    globalThis.addEventListener('mousemove', handleMouseMove);
    globalThis.addEventListener('mouseup', handleMouseUp);

    return () => {
      globalThis.removeEventListener('mousemove', handleMouseMove);
      globalThis.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setNavWidth]);

  const formKey = useMemo(() => {
    if (!selection) return `rest-form-${catalogKey}-none`;
    if (selection.kind === 'restConfiguration') return `rest-form-${catalogKey}-config`;
    if (selection.kind === 'rest') return `rest-form-${catalogKey}-rest-${selection.restId}`;
    return `rest-form-${catalogKey}-op-${selection.restId}-${selection.verb}-${selection.index}`;
  }, [catalogKey, selection]);

  const operationSchema = useMemo(() => {
    return CamelCatalogService.getComponent(CatalogKind.Processor, operationVerb)?.propertiesSchema;
  }, [operationVerb]);

  const getOperationFieldHelp = useCallback(
    (fieldName: string, fallbackTitle?: string) => {
      const schemaProperty = operationSchema?.properties?.[fieldName] as
        | { title?: string; description?: string; default?: unknown; type?: string; enum?: unknown[] }
        | undefined;
      const description = schemaProperty?.description;
      const defaultValue = schemaProperty?.default;
      const title = schemaProperty?.title ?? fallbackTitle ?? fieldName;
      const type = schemaProperty?.type ?? (Array.isArray(schemaProperty?.enum) ? 'enum' : undefined);

      if (!description && defaultValue === undefined) return undefined;

      return (
        <Popover
          bodyContent={
            <div>
              <strong>
                {title}
                {type ? ` <${type}>` : ''}
              </strong>
              {description && <p>{description}</p>}
              {defaultValue !== undefined && (
                <p>
                  Default:{' '}
                  {typeof defaultValue === 'string' ||
                  typeof defaultValue === 'number' ||
                  typeof defaultValue === 'boolean'
                    ? String(defaultValue)
                    : JSON.stringify(defaultValue)}
                </p>
              )}
            </div>
          }
          triggerAction="hover"
          withFocusTrap={false}
        >
          <Button variant="plain" aria-label={`More info about ${title}`} icon={<HelpIcon />} />
        </Popover>
      );
    },
    [operationSchema],
  );

  return (
    <ActionConfirmationModalContextProvider>
      <div className="rest-dsl-page">
        <Split className="rest-dsl-page-split" hasGutter>
          <RestDslNav
            navWidth={navWidth}
            restConfiguration={restConfiguration}
            restEntities={restEntities}
            restMethods={REST_METHODS}
            selection={selection}
            canAddRestEntities={canAddRestEntities}
            canDeleteRestEntities={canDeleteRestEntities}
            onCreateRestConfiguration={handleCreateRestConfiguration}
            onDeleteRestConfiguration={handleDeleteRestConfiguration}
            onSelectRestConfiguration={handleSelectRestConfiguration}
            onCreateRest={handleCreateRest}
            onDeleteRest={handleDeleteRest}
            onSelectRest={handleSelectRest}
            onAddOperation={openAddOperationModal}
            onSelectOperation={handleSelectOperation}
            onDeleteOperation={handleDeleteOperation}
            getListItemClass={getListItemClass}
          />
          <Button
            variant="plain"
            className="rest-dsl-page-resize-handle"
            onMouseDown={handleResizeStart}
            aria-label="Resize panels"
          >
            <hr className="rest-dsl-page-resize-handle-line" />
            <span className="rest-dsl-page-resize-grip" aria-hidden="true">
              ||
            </span>
          </Button>
          <RestDslDetails
            formKey={formKey}
            selectedFormState={selectedFormState}
            selection={selection}
            formTabsValue={formTabsValue}
            toUriSchema={toUriSchema}
            toUriFieldRef={toUriFieldRef}
            selectedToUriItem={selectedToUriItem}
            directEndpointItems={directEndpointItems}
            toUriValue={toUriValue}
            directRouteExists={directRouteExists}
            onToUriChange={handleToUriChange}
            onToUriClear={handleToUriClear}
            onCreateDirectRoute={handleCreateDirectRoute}
            onChangeProp={handleOnChangeProp}
          />
        </Split>
        {isAddOperationOpen && (
          <Modal isOpen variant={ModalVariant.small} onClose={closeAddOperationModal} aria-label="Add REST Operation">
            <ModalHeader title="Add REST Operation" />
            <ModalBody>
              <Form>
                <FormGroup
                  label="Operation Id"
                  fieldId="rest-operation-id"
                  labelHelp={getOperationFieldHelp('id', 'Id')}
                >
                  <TextInput
                    id="rest-operation-id"
                    value={operationId}
                    onChange={(_event, value) => setOperationId(value)}
                  />
                </FormGroup>
                <FormGroup
                  label="URI"
                  fieldId="rest-operation-uri"
                  isRequired
                  labelHelp={getOperationFieldHelp('path', 'Path')}
                >
                  <TextInput
                    id="rest-operation-uri"
                    value={operationPath}
                    onChange={(_event, value) => setOperationPath(value)}
                    isRequired
                    ref={uriInputRef}
                  />
                </FormGroup>
                <FormGroup
                  label="Operation Type"
                  fieldId="rest-operation-type"
                  isRequired
                  labelHelp={<OperationTypeHelp />}
                >
                  <OperationVerbSelect
                    isOpen={isVerbSelectOpen}
                    selected={operationVerb}
                    verbs={REST_METHODS}
                    onSelect={(value) => {
                      setOperationVerb(value);
                      setIsVerbSelectOpen(false);
                    }}
                    onOpenChange={setIsVerbSelectOpen}
                    onToggle={handleVerbToggle}
                  />
                </FormGroup>
              </Form>
            </ModalBody>
            <ModalFooter>
              <Button variant="primary" onClick={handleCreateOperation} isDisabled={!operationPath.trim()}>
                Add Operation
              </Button>
              <Button variant="link" onClick={closeAddOperationModal}>
                Cancel
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </div>
    </ActionConfirmationModalContextProvider>
  );
};

const getListItemClass = (selection: RestEditorSelection | undefined, target: RestEditorSelection): string => {
  const isSelected =
    selection?.kind === target.kind &&
    (target.kind === 'restConfiguration' ||
      (selection?.kind !== 'restConfiguration' &&
        selection?.restId === (target as { restId?: string }).restId &&
        (target.kind !== 'operation' ||
          (selection?.kind === 'operation' && selection.verb === target.verb && selection.index === target.index))));

  return `rest-dsl-page-item${isSelected ? ' rest-dsl-page-item-selected' : ''}`;
};
