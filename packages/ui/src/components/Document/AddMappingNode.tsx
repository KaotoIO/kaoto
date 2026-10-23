import './AddMappingNode.scss';

import { Add, AddAlt, Layers } from '@carbon/icons-react';
import { ActionList, ActionListGroup, ActionListItem, Button, Icon } from '@patternfly/react-core';
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
    refreshMappingTree({ structural: true });
  }, [nodeData, refreshMappingTree]);

  const handleContextMenuUpdate = useCallback(() => {
    refreshMappingTree({ structural: true });
  }, [refreshMappingTree]);

  return (
    <div data-testid={`node-target-${nodeData.id}`} className="node__container">
      <BaseNode
        nodeData={nodeData}
        data-testid={nodeData.title}
        isExpandable={false}
        namespaceMap={mappingTree.namespaceMap}
        title={
          <>
            <Icon className="node__spacer">
              <Add className="node__add__mapping__icon" />
            </Icon>
            <NodeTitle
              className="node__spacer node__add__mapping__text"
              nodeData={nodeData}
              isDocument={false}
              rank={rank}
            />
            <Icon className="node__spacer">
              <Layers className="node__add__mapping__icon" />
            </Icon>
          </>
        }
        rank={rank}
      >
        <ActionList>
          <ActionListGroup className="node__add__mapping__actions">
            <ActionListItem>
              <Button icon={<AddAlt />} variant="tertiary" onClick={handleAddMapping}>
                Add Mapping
              </Button>
            </ActionListItem>
            <MappingContextMenuAction
              nodeData={nodeData}
              dropdownLabel="Add Mapping Instruction"
              onUpdate={handleContextMenuUpdate}
            />
          </ActionListGroup>
        </ActionList>
      </BaseNode>
    </div>
  );
};
