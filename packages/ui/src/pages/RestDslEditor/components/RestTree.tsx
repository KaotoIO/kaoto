import './RestTree.scss';

import { TreeNode, TreeView } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { restToTree } from '../rest-to-tree';
import { MethodBadge } from './MethodBadge';

export type IRestTreeSelection = { entityId: string; modelPath: string };
export interface IRestTree extends PropsWithChildren {
  entities: BaseVisualCamelEntity[];
  onSelect: (selection: IRestTreeSelection) => void;
}

export const RestTree: FunctionComponent<IRestTree> = ({ entities, onSelect, children }) => {
  const restTreeNodes = restToTree(entities);

  return (
    <>
      <div>{children}</div>

      <div className="rest-tree">
        <TreeView label="Rest DSL Configuration">
          {restTreeNodes.map((node) => (
            <TreeNode
              isExpanded
              key={node.id}
              label={node.id}
              onSelect={() => {
                onSelect({ entityId: node.entityId, modelPath: node.modelPath });
              }}
            >
              {node.children?.map((child) => {
                const currentEntity = entities.find((entity) => entity.id === node.entityId);
                const pathLabel = currentEntity?.getNodeDefinition(child?.modelPath).path;
                const label = pathLabel ?? <span className="rest-tree__label-unspecified">not specified</span>;
                return (
                  <TreeNode
                    key={child.id}
                    label={label}
                    renderIcon={() => <MethodBadge type={child.type} />}
                    onSelect={() => {
                      onSelect({ entityId: child.entityId, modelPath: child.modelPath });
                    }}
                  />
                );
              })}
            </TreeNode>
          ))}
        </TreeView>
      </div>
    </>
  );
};
