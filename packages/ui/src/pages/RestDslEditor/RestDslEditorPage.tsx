import './RestDslEditorPage.scss';

import { CanvasFormTabsProvider, getCamelRandomId, KaotoForm } from '@kaoto/forms';
import { FunctionComponent, useCallback, useState } from 'react';

import { customFieldsFactoryfactory } from '../../components/Visualization/Canvas/Form/fields/custom-fields-factory';
import { SuggestionRegistrar } from '../../components/Visualization/Canvas/Form/suggestions/SuggestionsProvider';
import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';
import { EntityType } from '../../models/camel/entities';
import { CamelRestVisualEntity } from '../../models/visualization/flows/camel-rest-visual-entity';
import { IRestTreeSelection, RestTree } from './components/RestTree';
import { RestTreeToolbar, RestTreeToolbarProps } from './components/RestTreeToolbar';

export const RestDslEditorPage: FunctionComponent = () => {
  const { visualEntities, camelResource, updateEntitiesFromCamelResource } = useEntityContext();
  const [selectedElement, setSelectedElement] = useState<IRestTreeSelection | undefined>();

  const selectedEntity = visualEntities.find((entity) => entity.id === selectedElement?.entityId);
  const schema = selectedEntity?.getNodeSchema(selectedElement?.modelPath);
  const model = selectedEntity?.getNodeDefinition(selectedElement?.modelPath);
  const omitFields = selectedEntity?.getOmitFormFields();

  const handleOnChangeIndividualProp = useCallback(
    (path: string, value: unknown) => {
      if (!selectedEntity) return;

      let updatedValue = value;
      if (typeof value === 'string' && value.trim() === '') {
        updatedValue = undefined;
      }

      const fullPath = `${selectedEntity.getRootPath()}.${path}`;
      selectedEntity.updateModel(fullPath, updatedValue);
      updateEntitiesFromCamelResource();
    },
    [selectedEntity, updateEntitiesFromCamelResource],
  );

  const handleAddRestConfiguration = useCallback(() => {
    const newId = camelResource.addNewEntity(EntityType.RestConfiguration);
    updateEntitiesFromCamelResource();
    setSelectedElement({ modelPath: 'restConfiguration', entityId: newId });
  }, [camelResource, updateEntitiesFromCamelResource]);

  const handleAddRest = useCallback(() => {
    const newId = camelResource.addNewEntity(EntityType.Rest);
    updateEntitiesFromCamelResource();
    setSelectedElement({ modelPath: 'rest', entityId: newId });
  }, [camelResource, updateEntitiesFromCamelResource]);

  const handleAddMethod: RestTreeToolbarProps['onAddMethod'] = useCallback(
    (model) => {
      if (!selectedEntity || !(selectedEntity instanceof CamelRestVisualEntity)) return;

      const restDefinition = selectedEntity.toJSON().rest;
      restDefinition[model.method] ??= [];

      const methodsArray = restDefinition[model.method]!;
      const methodId = model.id ?? getCamelRandomId(model.method);
      methodsArray.push({
        id: methodId,
        path: model.path,
        to: {
          uri: 'direct',
          parameters: {
            name: `operation-${model.method}-${methodId}`,
          },
        },
      });

      updateEntitiesFromCamelResource();
      setSelectedElement({ entityId: selectedEntity.id, modelPath: `rest.${model.method}.${methodsArray.length - 1}` });
    },
    [selectedEntity, updateEntitiesFromCamelResource],
  );

  const handleDelete = useCallback(() => {
    if (!selectedEntity || !selectedElement) return;

    if (selectedElement.modelPath === selectedEntity.getRootPath()) {
      /* Remove the entire Rest or RestConfiguration */
      camelResource.removeEntity([selectedElement.entityId]);
    } else {
      /* Remove a method */
      selectedEntity.removeStep(selectedElement.modelPath);
    }

    updateEntitiesFromCamelResource();
    setSelectedElement(undefined);
  }, [selectedEntity, selectedElement, updateEntitiesFromCamelResource, camelResource]);

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
      <div style={{ flex: '0 0 300px', borderRight: '1px solid #ccc', padding: '16px' }}>
        <RestTree entities={visualEntities} onSelect={setSelectedElement}>
          <RestTreeToolbar
            entities={visualEntities}
            selectedElement={selectedElement}
            onAddRestConfiguration={handleAddRestConfiguration}
            onAddRest={handleAddRest}
            onAddMethod={handleAddMethod}
            onDelete={handleDelete}
          />
        </RestTree>
      </div>

      <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
        {!selectedElement?.entityId && <div>Select an entity from the list to edit its configuration</div>}

        {selectedElement && (
          <>
            <h2>Edit {selectedElement.modelPath}</h2>
            <CanvasFormTabsProvider tab="All">
              <SuggestionRegistrar>
                <KaotoForm
                  key={`${selectedElement.entityId}__${selectedElement.modelPath}`}
                  schema={schema}
                  onChangeProp={handleOnChangeIndividualProp}
                  model={model}
                  omitFields={omitFields}
                  customFieldsFactory={customFieldsFactoryfactory}
                />
              </SuggestionRegistrar>
            </CanvasFormTabsProvider>
          </>
        )}
      </div>
    </div>
  );
};
