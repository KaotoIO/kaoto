import './AddMappingNode.scss';

import { ActionList, ActionListGroup, ActionListItem, Button, Icon } from '@patternfly/react-core';
import { LayerGroupIcon, PlusCircleIcon, PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { AddMappingNodeData } from '../../models/datamapper/visualization';
import { MappingActionService } from '../../services/visualization/mapping-action.service';
import { MappingContextMenuAction } from './actions/MappingMenu/MappingContextMenuAction';
import { BaseNode } from './Nodes/BaseNode';
import { NodeTitle } from './NodeTitle/NodeTitle';

export const AddMappingNode: FunctionComponent<{ nodeData: AddMappingNodeData; rank: number }> = ({
  nodeData,
  rank,
}) => {
  const { mappingTree, refreshMappingTree } = useDataMapper();

  const handleAddMapping = useCallback(() => {
    MappingActionService.addMapping(nodeData);
    refreshMappingTree();
  }, [nodeData, refreshMappingTree]);

  return (
    <div data-testid={`node-target-${nodeData.id}`} className="node__container">
      <BaseNode
        nodeData={nodeData}
        data-testid={nodeData.title}
        isExpandable={false}
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
              namespaceMap={mappingTree.namespaceMap}
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
            <MappingContextMenuAction
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
