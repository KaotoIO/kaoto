import './RestDslEditorPage.scss';

import { CodeSnippet } from '@carbon/react';
import { Rest } from '@kaoto/camel-catalog/types';
import { CanvasFormTabsProvider, FilteredFieldProvider, getCamelRandomId, KaotoForm } from '@kaoto/forms';
import { FunctionComponent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Loading } from '../../components/Loading';
import { ResizableSplitPanels } from '../../components/ResizableSplitPanels/ResizableSplitPanels';
import { SuggestionRegistrar } from '../../components/Visualization/Canvas/Form/suggestions/SuggestionsProvider';
import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';
import { CatalogKind } from '../../models/catalog-kind';
import { EntityType } from '../../models/entities';
import { KaotoSchemaDefinition } from '../../models/kaoto-schema';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { RestEntity } from '../../models/visualization/flows/rest-entity';
import { getValue } from '../../utils';
import { AddMethodFormModel } from './components/add-method-schema';
import { AddMethodModal } from './components/AddMethodModal';
import { getRestEntities } from './components/get-rest-entities';
import { RestDslFormHeader } from './components/RestDslFormHeader';
import { restFormFieldFactory } from './components/restFormFieldFactory';
import { IRestTreeSelection, RestTree } from './components/RestTree';
import { RestTreeToolbar } from './components/RestTreeToolbar';

const DEFAULT_TREE_PANEL_WIDTH_PERCENT = 30;
const DEFAULT_REST_METHOD_URI = 'direct';

/**
 * Main page component for editing REST DSL configurations.
 * Provides a split-panel interface with a tree view on the left and a form editor on the right.
 * Supports adding/editing REST configurations, REST services, and REST methods.
 */
export const RestDslEditorPage: FunctionComponent = () => {
  const { entities, camelResource, isLoading, updateEntitiesFromCamelResource, updateSourceCodeFromEntities } =
    useEntityContext();
  const [selectedElement, setSelectedElement] = useState<IRestTreeSelection | undefined>();
  const selectElement = useCallback((selection: IRestTreeSelection) => {
    setSelectedElement((current) =>
      current?.entityId === selection.entityId && current.modelPath === selection.modelPath ? current : selection,
    );
  }, []);
  const restRelatedEntities = useMemo(() => getRestEntities(entities), [entities]);
  const [previousEntities, setPreviousEntities] = useState(restRelatedEntities);

  if (!isLoading && previousEntities !== restRelatedEntities) {
    setPreviousEntities(restRelatedEntities);
    const index = previousEntities.findIndex((entity) => entity.id === selectedElement?.entityId);
    if (selectedElement && index !== -1) {
      let nextEntity = restRelatedEntities.find((entity) => entity.id === selectedElement.entityId);
      // Configuration IDs are generated on every parse; service IDs can be edited in source.
      // Retain the selection by position only when the entity list has the same shape.
      const candidate = restRelatedEntities[index];
      if (
        !nextEntity &&
        previousEntities.length === restRelatedEntities.length &&
        candidate?.type === previousEntities[index].type &&
        !previousEntities.some((entity) => entity.id === candidate.id)
      ) {
        nextEntity = candidate;
      }
      if (!nextEntity || getValue(nextEntity.toJSON(), selectedElement.modelPath) === undefined) {
        setSelectedElement(undefined);
      } else if (nextEntity.id !== selectedElement.entityId) {
        setSelectedElement({ ...selectedElement, entityId: nextEntity.id });
      }
    }
  }

  const { entityId, modelPath, ids } = selectedElement ?? {};
  const selectedEntity = restRelatedEntities.find((entity) => entity.id === entityId);
  const selectedEntityLabel =
    selectedEntity instanceof CamelRestVisualEntity ? (selectedEntity.getRawRestDef().id ?? entityId) : entityId;
  const [loadedForm, setLoadedForm] = useState<{
    entity: RestEntity;
    selection: IRestTreeSelection;
    model: unknown;
    schema: KaotoSchemaDefinition['schema'] | undefined;
  }>();
  const isSameSelection = loadedForm?.selection.ids === ids && loadedForm?.selection.modelPath === modelPath;
  const schema = isSameSelection ? loadedForm?.schema : undefined;
  const parsedModel = isSameSelection ? loadedForm?.model : undefined;
  const isFormRefreshing =
    !!selectedElement && (isLoading || loadedForm?.entity !== selectedEntity || !isSameSelection);

  useEffect(() => {
    if (isLoading || !selectedEntity || !selectedElement) return;
    let cancelled = false;
    const { modelPath, ids } = selectedElement;
    Promise.all([selectedEntity.fetchNodeDefinition(modelPath, ids), selectedEntity.fetchNodeSchema(ids)])
      .then(([model, resolved]) => {
        if (!cancelled) {
          setLoadedForm({ entity: selectedEntity, selection: selectedElement, model, schema: resolved });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadedForm(undefined);
          console.error('Failed to fetch REST DSL schema:', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEntity, selectedElement, isLoading]);

  const [treeVersion, setTreeVersion] = useState(0);

  const [isAddMethodModalOpen, setIsAddMethodModalOpen] = useState(false);
  const [addMethodModalKey, setAddMethodModalKey] = useState(0);
  const launcherButtonRef = useRef<HTMLButtonElement>(null);

  /** Opens the Add Operation modal, resetting its form each time */
  const openAddMethodModal = useCallback(() => {
    setAddMethodModalKey((key) => key + 1);
    setIsAddMethodModalOpen(true);
  }, []);

  /** Closes the Add Operation modal */
  const closeAddMethodModal = useCallback(() => {
    setIsAddMethodModalOpen(false);
  }, []);

  /** Handles changes to individual properties in the form editor */
  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      if (isFormRefreshing || !selectedElement || !selectedEntity) return;

      let updatedValue = value;
      if (typeof value === 'string' && value.trim() === '') {
        updatedValue = undefined;
      }

      const fullPath = `${modelPath}.${path}`;
      selectedEntity.updateModel(fullPath, updatedValue);
      updateSourceCodeFromEntities();
      setTreeVersion((version) => version + 1);
    },
    [isFormRefreshing, modelPath, selectedElement, selectedEntity, updateSourceCodeFromEntities],
  );

  /** Adds a new REST configuration entity to the resource */
  const handleAddRestConfiguration = useCallback(() => {
    if (isLoading) return;
    const newId = camelResource.addNewEntity(EntityType.RestConfiguration);
    updateEntitiesFromCamelResource();
    setSelectedElement({
      modelPath: 'restConfiguration',
      entityId: newId,
      ids: { primaryNodeId: { name: 'restConfiguration', catalogKind: CatalogKind.Entity } },
    });
    setTreeVersion((version) => version + 1);
  }, [camelResource, isLoading, updateEntitiesFromCamelResource]);

  /** Adds a new REST service entity to the resource */
  const handleAddRest = useCallback(() => {
    if (isLoading) return;
    const newId = camelResource.addNewEntity(EntityType.Rest);
    setSelectedElement({
      modelPath: 'rest',
      entityId: newId,
      ids: { primaryNodeId: { name: 'rest', catalogKind: CatalogKind.Entity } },
    });
    updateEntitiesFromCamelResource();
    setTreeVersion((version) => version + 1);
  }, [camelResource, isLoading, updateEntitiesFromCamelResource]);

  /** Adds a new REST method to the selected REST service */
  const handleAddMethod = useCallback(
    (model: AddMethodFormModel) => {
      if (isLoading || !selectedEntity || !(selectedEntity instanceof CamelRestVisualEntity)) return;

      const restDefinition = selectedEntity.toJSON().rest;
      restDefinition[model.method] ??= [];

      const methodsArray = restDefinition[model.method]!;
      const methodId = model.id ?? getCamelRandomId(model.method);
      methodsArray.push({
        id: methodId,
        path: model.path,
        to: {
          uri: DEFAULT_REST_METHOD_URI,
          parameters: {
            name: `direct-${methodId}`,
          },
        },
      });

      updateEntitiesFromCamelResource();
      setSelectedElement({
        entityId: selectedEntity.id,
        modelPath: `rest.${model.method}.${methodsArray.length - 1}`,
        ids: { primaryNodeId: { name: model.method, catalogKind: CatalogKind.Pattern } },
      });
      setTreeVersion((version) => version + 1);
    },
    [isLoading, selectedEntity, updateEntitiesFromCamelResource],
  );

  /** Deletes the selected REST entity or method */
  const handleDelete = useCallback(() => {
    if (isLoading || !selectedEntity || !selectedElement) return;

    if (selectedElement.modelPath === selectedEntity.getRootPath()) {
      /* Remove the entire Rest or RestConfiguration */
      camelResource.removeEntity([selectedElement.entityId]);
    } else {
      /* Remove a method */
      selectedEntity.removeStep(selectedElement.modelPath);
    }

    setSelectedElement(undefined);
    updateEntitiesFromCamelResource();
  }, [isLoading, selectedEntity, selectedElement, updateEntitiesFromCamelResource, camelResource]);

  return (
    <>
      <ResizableSplitPanels
        defaultLeftWidth={DEFAULT_TREE_PANEL_WIDTH_PERCENT}
        leftPanel={
          <RestTree
            entities={restRelatedEntities}
            selected={selectedElement}
            onSelect={selectElement}
            onDelete={handleDelete}
            key={treeVersion}
          >
            <RestTreeToolbar
              entities={restRelatedEntities}
              selectedElement={selectedElement}
              launcherButtonRef={launcherButtonRef}
              onAddRestConfiguration={handleAddRestConfiguration}
              onAddRest={handleAddRest}
              onAddMethodClick={openAddMethodModal}
              onDelete={handleDelete}
            />
          </RestTree>
        }
        rightPanel={
          <div className="rest-right-panel" inert={isFormRefreshing || undefined}>
            {!entityId && <div>Select an entity from the list to edit its configuration</div>}
            {selectedElement && (
              <>
                <div className="form-rest-title">
                  <span>Edit </span>
                  <span>{selectedEntityLabel} </span>
                  {modelPath?.startsWith('rest.') && (
                    <>
                      <span>/ {modelPath?.split('.')[1]?.toUpperCase()} /</span>
                      <CodeSnippet feedback="Copied to clipboard" type="inline">
                        {(parsedModel as Rest)?.path}
                      </CodeSnippet>
                    </>
                  )}
                </div>
                {!schema || Object.keys(schema).length === 0 ? (
                  <Loading>Loading schemas...</Loading>
                ) : (
                  <Suspense fallback={<Loading>Loading form...</Loading>}>
                    <CanvasFormTabsProvider tab="All">
                      <FilteredFieldProvider>
                        <RestDslFormHeader />
                        <SuggestionRegistrar>
                          <KaotoForm
                            schema={schema}
                            onChangeProp={handleOnChangeIndividualProp}
                            model={parsedModel}
                            customFieldsFactory={restFormFieldFactory}
                          />
                        </SuggestionRegistrar>
                      </FilteredFieldProvider>
                    </CanvasFormTabsProvider>
                  </Suspense>
                )}
              </>
            )}
          </div>
        }
      />

      {/*
       * Render the modal only after it has first been opened (addMethodModalKey > 0).
       * ComposedModal restores focus to launcherButtonRef whenever it is mounted while
       * closed, so mounting it eagerly would steal focus to the Actions trigger on page
       * load. Once mounted it stays mounted (page sibling, not under the keyed RestTree),
       * so Carbon restores focus natively on Cancel, Escape and Add.
       */}
      {addMethodModalKey > 0 && (
        <AddMethodModal
          key={addMethodModalKey}
          open={isAddMethodModalOpen}
          launcherButtonRef={launcherButtonRef}
          onClose={closeAddMethodModal}
          onAddMethod={handleAddMethod}
        />
      )}
    </>
  );
};
