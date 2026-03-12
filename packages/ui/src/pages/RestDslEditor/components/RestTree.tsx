import './RestTree.scss';

import { TreeNode, TreeView } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { restToTree } from '../rest-to-tree';
import { MethodBadge } from './MethodBadge';

export type IRestTreeSelection = { entityId: string; modelPath: string };
export interface IRestTree extends PropsWithChildren {
  entities: BaseVisualCamelEntity[];
  selected?: IRestTreeSelection;
  onSelect: (selection: IRestTreeSelection) => void;
}

export const RestTree: FunctionComponent<IRestTree> = ({ entities, selected, onSelect, children }) => {
  const restTreeNodes = restToTree(entities);

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
                  const label = pathLabel ?? <span className="rest-tree__label-unspecified">not specified</span>;
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
