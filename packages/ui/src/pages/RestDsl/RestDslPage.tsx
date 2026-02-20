import './RestDslPage.scss';

import { CanvasFormTabsContextResult } from '@kaoto/forms';
import { Split } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';

import { useRuntimeContext } from '../../hooks/useRuntimeContext/useRuntimeContext';
import { EntityType } from '../../models/camel/entities';
import { REST_DSL_VERBS } from '../../models/special-processors.constants';
import { CamelRestConfigurationVisualEntity } from '../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { EntitiesContext } from '../../providers';
import { ActionConfirmationModalContextProvider } from '../../providers/action-confirmation-modal.provider';
import { setValue } from '../../utils';
import { RestDslAddOperationModal } from './components/RestDslAddOperationModal';
import { RestDslResizeHandle } from './components/RestDslResizeHandle';
import { useRestDslOperations } from './hooks/useRestDslOperations';
import { useRestDslResize } from './hooks/useRestDslResize';
import { useRestDslSelection } from './hooks/useRestDslSelection';
import { useRestDslToUri } from './hooks/useRestDslToUri';
import { RestDslDetails } from './RestDslDetails';
import { RestDslNav } from './RestDslNav';
import { RestVerb } from './restDslTypes';
import { collectDirectEndpoints, collectDirectRouteInputs, getListItemClass } from './utils/rest-dsl-helpers';

const REST_METHODS = REST_DSL_VERBS;

export const RestDslPage: FunctionComponent = () => {
  const entitiesContext = useContext(EntitiesContext);
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

  const directRouteInputs = useMemo(
    () => collectDirectRouteInputs(entitiesContext?.visualEntities ?? []),
    [entitiesContext?.visualEntities],
  );

  const directEndpointItems = useMemo(
    () => collectDirectEndpoints(entitiesContext?.visualEntities ?? []),
    [entitiesContext?.visualEntities],
  );

  const canAddRestEntities = useMemo(() => {
    return Boolean(entitiesContext?.camelResource && 'addNewEntity' in entitiesContext.camelResource);
  }, [entitiesContext?.camelResource]);

  const canDeleteRestEntities = useMemo(() => {
    return Boolean(entitiesContext?.camelResource && 'removeEntity' in entitiesContext.camelResource);
  }, [entitiesContext?.camelResource]);

  const { selection, setSelection, selectedFormState } = useRestDslSelection({
    restConfiguration,
    restEntities,
  });

  const { navWidth, handleResizeStart } = useRestDslResize();

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

      // Force a lightweight rerender so nav labels based on editable model IDs update on blur/input.
      if (path === 'id' || path === 'path') {
        setSelection((current) => (current ? { ...current } : current));
      }
    },
    [entitiesContext, selectedFormState, setSelection],
  );

  const {
    toUriValue,
    toUriFieldRef,
    toUriSchema,
    selectedToUriItem,
    directRouteExists,
    handleToUriChange,
    handleToUriClear,
    handleCreateDirectRoute,
  } = useRestDslToUri({
    selection,
    selectedFormState,
    restEntities,
    directEndpointItems,
    directRouteInputs,
    canAddRestEntities,
    onChangeProp: handleOnChangeProp,
  });

  const {
    isAddOperationOpen,
    addOperationRestId,
    openAddOperationModal,
    closeAddOperationModal,
    handleCreateOperation,
    handleCreateRestConfiguration,
    handleCreateRest,
    handleDeleteRestConfiguration,
    handleDeleteRest,
    handleDeleteOperation,
  } = useRestDslOperations({
    restEntities,
    restConfiguration,
    canAddRestEntities,
    canDeleteRestEntities,
    setSelection,
  });

  const handleSelectOperation = useCallback(
    (restId: string, verb: RestVerb, index: number) => {
      setSelection({ kind: 'operation', restId, verb, index });
    },
    [setSelection],
  );

  const handleSelectRestConfiguration = useCallback(() => {
    setSelection({ kind: 'restConfiguration' });
  }, [setSelection]);

  const handleSelectRest = useCallback(
    (restId: string) => {
      setSelection({ kind: 'rest', restId });
    },
    [setSelection],
  );

  const formKey = useMemo(() => {
    if (!selection) return `rest-form-${catalogKey}-none`;
    if (selection.kind === 'restConfiguration') return `rest-form-${catalogKey}-config`;
    if (selection.kind === 'rest') return `rest-form-${catalogKey}-rest-${selection.restId}`;
    return `rest-form-${catalogKey}-op-${selection.restId}-${selection.verb}-${selection.index}`;
  }, [catalogKey, selection]);

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
          <RestDslResizeHandle onResizeStart={handleResizeStart} />
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
        <RestDslAddOperationModal
          isOpen={isAddOperationOpen}
          restId={addOperationRestId}
          onClose={closeAddOperationModal}
          onCreateOperation={handleCreateOperation}
        />
      </div>
    </ActionConfirmationModalContextProvider>
  );
};
