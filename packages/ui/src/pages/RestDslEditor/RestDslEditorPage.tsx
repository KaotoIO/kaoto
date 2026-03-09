import './RestDslEditorPage.scss';

import { TrashCan } from '@carbon/icons-react';
import { Button, Tag, TreeNode, TreeView } from '@carbon/react';
import { CanvasFormTabsProvider, KaotoForm } from '@kaoto/forms';
import { FunctionComponent, useCallback, useState } from 'react';

import { customFieldsFactoryfactory } from '../../components/Visualization/Canvas/Form/fields/custom-fields-factory';
import { SuggestionRegistrar } from '../../components/Visualization/Canvas/Form/suggestions/SuggestionsProvider';
import { useEntityContext } from '../../hooks/useEntityContext/useEntityContext';
import { restToTree } from './rest-to-tree';

export const RestDslEditorPage: FunctionComponent = () => {
  const { visualEntities, updateSourceCodeFromEntities } = useEntityContext();
  const [selectedElement, setSelectedElement] = useState<{ entityId: string; path: string } | undefined>();
  const restTreeNodes = restToTree(visualEntities);

  const selectedEntity = visualEntities.find((entity) => entity.id === selectedElement?.entityId);
  const schema = selectedEntity?.getNodeSchema(selectedEntity.getRootPath());
  const model = selectedEntity?.getNodeDefinition(selectedEntity.getRootPath());
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
      updateSourceCodeFromEntities();
    },
    [selectedEntity, updateSourceCodeFromEntities],
  );

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
      <div style={{ flex: '0 0 300px', borderRight: '1px solid #ccc', padding: '16px' }}>
        <TreeView label="Rest DSL Configuration">
          {restTreeNodes.map((node) => (
            <TreeNode
              isExpanded
              key={node.id}
              label={node.label}
              onSelect={() => {
                setSelectedElement({ entityId: node.entityId, path: node.modelPath });
              }}
            >
              {node.children?.map((child) => (
                <TreeNode
                  key={child.id}
                  label={child.label}
                  renderIcon={() => <Tag>{child.label}</Tag>}
                  onSelect={() => {
                    setSelectedElement({ entityId: child.entityId, path: child.modelPath });
                  }}
                />
              ))}
            </TreeNode>
          ))}
        </TreeView>
      </div>

      <div style={{ flex: 1, padding: '16px', overflow: 'auto' }}>
        {!selectedElement?.entityId && <div>Select an entity from the list to edit its configuration</div>}

        {selectedElement && (
          <>
            <h2>
              Edit {selectedElement.path}{' '}
              <Button
                hasIconOnly
                kind="danger"
                iconDescription={`Delete ${selectedElement.entityId}`}
                renderIcon={TrashCan}
                onClick={() => {
                  selectedEntity?.removeStep(selectedElement.path);
                  updateSourceCodeFromEntities();
                  setSelectedElement(undefined);
                }}
              />
            </h2>
            <CanvasFormTabsProvider tab="All">
              <SuggestionRegistrar>
                <KaotoForm
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
