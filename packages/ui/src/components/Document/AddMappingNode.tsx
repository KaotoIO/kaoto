import { ActionList, ActionListGroup, ActionListItem, Button, Icon } from '@patternfly/react-core';
import { LayerGroupIcon, PlusCircleIcon, PlusIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { AddMappingNodeData, NodeReference, TargetFieldNodeData } from '../../models/datamapper/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { ConditionMenuAction } from './actions/ConditionMenuAction';
import './Document.scss';
import { NodeContainer } from './NodeContainer';
import { NodeTitle } from './NodeTitle';

export const AddMappingNode: FunctionComponent<{ nodeData: AddMappingNodeData }> = ({ nodeData }) => {
  const { refreshMappingTree } = useDataMapper();
  const { getNodeReference, setNodeReference } = useCanvas();

  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefId = nodeData.path.toString();
  const nodeReference = useRef<NodeReference>({
    path: nodeRefId,
    isSource: false,
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  });
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  const handleAddMapping = useCallback(() => {
    VisualizationService.addMapping(nodeData);
    refreshMappingTree();
  }, [nodeData, refreshMappingTree]);

  return (
    <div data-testid={`node-target-${nodeData.id}`} className={clsx({ node__container: true })}>
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div className={clsx({ node__add__mapping__header: true })}>
          <NodeContainer ref={headerRef} nodeData={nodeData}>
            <section className="node__row" data-draggable={false}>
              <span className="node__row">
                <Icon className="node__spacer">
                  <PlusIcon className="node__add__mapping__icon" />
                </Icon>
                <Icon className="node__spacer">
                  <LayerGroupIcon className="node__add__mapping__icon" />
                </Icon>
                <NodeTitle
                  className="node__spacer node__add__mapping__text"
                  nodeData={nodeData as TargetFieldNodeData}
                  isDocument={false}
                  rank={0}
                />
              </span>

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
            </section>
          </NodeContainer>
        </div>
      </NodeContainer>
    </div>
  );
};
