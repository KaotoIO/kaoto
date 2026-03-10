import { Tag, TreeNode, TreeView } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { restToTree } from '../rest-to-tree';

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

      <TreeView label="Rest DSL Configuration">
        {restTreeNodes.map((node) => (
          <TreeNode
            isExpanded
            key={node.id}
            label={node.label}
            onSelect={() => {
              onSelect({ entityId: node.entityId, modelPath: node.modelPath });
            }}
          >
            {node.children?.map((child) => (
              <TreeNode
                key={child.id}
                label={child.label}
                renderIcon={() => <Tag>{child.label}</Tag>}
                onSelect={() => {
                  onSelect({ entityId: child.entityId, modelPath: child.modelPath });
                }}
              />
            ))}
          </TreeNode>
        ))}
      </TreeView>
    </>
  );
};
