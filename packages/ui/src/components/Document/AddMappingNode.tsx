import { ActionList, ActionListGroup, ActionListItem, Button, Icon } from '@patternfly/react-core';
import { LayerGroupIcon, PlusCircleIcon, PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { AddMappingNodeData } from '../../models/datamapper/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { ConditionMenuAction } from './actions/ConditionMenuAction';
import { NodeTitle } from './NodeTitle';
import { BaseNode } from './Nodes/BaseNode';
import './AddMappingNode.scss';

export const AddMappingNode: FunctionComponent<{ nodeData: AddMappingNodeData; rank: number }> = ({
  nodeData,
  rank,
}) => {
  const { refreshMappingTree } = useDataMapper();

  const handleAddMapping = useCallback(() => {
    VisualizationService.addMapping(nodeData);
    refreshMappingTree();
  }, [nodeData, refreshMappingTree]);

  return (
    <div data-testid={`node-target-${nodeData.id}`} className="node__container">
      <BaseNode
        data-testid={nodeData.title}
        isExpandable={false}
        isDraggable={false}
        title={
          <>
            <Icon className="node__spacer">
              <PlusIcon className="node__add__mapping__icon" />
            </Icon>
            <NodeTitle
              className="node__spacer node__add__mapping__text"
              nodeData={nodeData}
              isDocument={false}
              rank={rank}
            />
            <Icon className="node__spacer">
              <LayerGroupIcon className="node__add__mapping__icon" />
            </Icon>
          </>
        }
        rank={rank}
      >
        <ActionList>
          <ActionListGroup className="node__add__mapping__actions">
            <ActionListItem>
              <Button icon={<PlusCircleIcon />} variant="tertiary" onClick={handleAddMapping}>
                Add Mapping
              </Button>
            </ActionListItem>
            <ConditionMenuAction
              nodeData={nodeData}
              dropdownLabel="Add Conditional Mapping"
              onUpdate={refreshMappingTree}
            />
          </ActionListGroup>
        </ActionList>
      </BaseNode>
    </div>
  );
};
