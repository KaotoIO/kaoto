import './RestTree.scss';

import { TreeNode, TreeView } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { restToTree } from '../rest-to-tree';
import { MethodBadge } from './MethodBadge';

/** Represents a selected item in the REST tree */
export type IRestTreeSelection = { entityId: string; modelPath: string };

/**
 * Props for the RestTree component.
 */
export interface IRestTree extends PropsWithChildren {
  entities: BaseVisualCamelEntity[];
  selected?: IRestTreeSelection;
  onSelect: (selection: IRestTreeSelection) => void;
}

/**
 * Tree view component for displaying REST DSL configurations and services.
 * Shows REST configurations and REST services with their methods in a hierarchical structure.
 */
export const RestTree: FunctionComponent<IRestTree> = ({ entities, selected, onSelect, children }) => {
  const restTreeNodes = restToTree(entities);

  /** Generates a unique node ID from entity ID and model path */
  const getNodeId = (entityId: string, modelPath: string) => `${entityId}::${modelPath}`;
  const activeNodeId = selected ? getNodeId(selected.entityId, selected.modelPath) : undefined;

  return (
    <>
      <div>{children}</div>

      <div className="rest-tree">
        <TreeView label="Rest DSL Configuration" active={activeNodeId}>
          {restTreeNodes.map((node) => {
            const nodeId = getNodeId(node.entityId, node.modelPath);
            return (
              <TreeNode
                isExpanded
                key={nodeId}
                id={nodeId}
                label={node.id}
                onSelect={() => {
                  onSelect({ entityId: node.entityId, modelPath: node.modelPath });
                }}
              >
                {node.children?.map((child) => {
                  const currentEntity = entities.find((entity) => entity.id === node.entityId);
                  const pathLabel = currentEntity?.getNodeDefinition(child?.modelPath).path;
                  const label = pathLabel?.trim() ? (
                    pathLabel
                  ) : (
                    <span className="rest-tree__label-unspecified">not specified</span>
                  );
                  const childId = getNodeId(child.entityId, child.modelPath);
                  return (
                    <TreeNode
                      key={childId}
                      id={childId}
                      label={label}
                      renderIcon={() => <MethodBadge type={child.type} />}
                      onSelect={() => {
                        onSelect({ entityId: child.entityId, modelPath: child.modelPath });
                      }}
                    />
                  );
                })}
              </TreeNode>
            );
          })}
        </TreeView>
      </div>
    </>
  );
};
