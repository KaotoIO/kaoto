import './RestTree.scss';

import { TreeNode } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { EditorTree } from '../../../components/EditorShell';
import { IVisualizationNodeIds } from '../../../models/visualization/base-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { RestEntity } from '../../../models/visualization/flows/rest-entity';
import { getValue } from '../../../utils';
import { restToTree } from '../rest-to-tree';
import { MethodBadge } from './MethodBadge';

/** Represents a selected item in the REST tree */
export type IRestTreeSelection = { entityId: string; modelPath: string; ids: IVisualizationNodeIds };

/**
 * Props for the RestTree component.
 */
export interface IRestTree extends PropsWithChildren {
  entities: RestEntity[];
  selected?: IRestTreeSelection;
  onSelect: (selection: IRestTreeSelection) => void;
  onDelete: () => void;
}

/**
 * Tree view component for displaying REST DSL configurations and services.
 * Shows REST configurations and REST services with their methods in a hierarchical structure.
 */
export const RestTree: FunctionComponent<IRestTree> = ({ entities, selected, onSelect, onDelete, children }) => {
  const restTreeNodes = restToTree(entities);

  /** Generates a unique node ID from entity ID and model path */
  const getNodeId = (entityId: string, modelPath: string) => `${entityId}::${modelPath}`;
  const activeNodeId = selected ? getNodeId(selected.entityId, selected.modelPath) : undefined;
  const selectionsByNodeId = new Map<string, IRestTreeSelection>();

  restTreeNodes.forEach((node) => {
    selectionsByNodeId.set(getNodeId(node.entityId, node.modelPath), {
      entityId: node.entityId,
      modelPath: node.modelPath,
      ids: { primaryNodeId: node.primaryNodeId },
    });
    node.children?.forEach((child) => {
      selectionsByNodeId.set(getNodeId(child.entityId, child.modelPath), {
        entityId: child.entityId,
        modelPath: child.modelPath,
        ids: { primaryNodeId: child.primaryNodeId },
      });
    });
  });

  const resolveSelection = (treeItem: HTMLElement) => {
    const selection = selectionsByNodeId.get(treeItem.id);
    if (!selection) return false;

    if (selection.entityId !== selected?.entityId || selection.modelPath !== selected.modelPath) {
      onSelect(selection);
    }
    return true;
  };

  return (
    <>
      <div>{children}</div>

      {/* controllable={false}: nodes use isExpanded without onToggle, so Carbon's controllable mode would keep them expanded */}
      <EditorTree
        className="rest-tree"
        label="Rest DSL Configuration"
        activeId={activeNodeId}
        menuLabel="REST tree node actions"
        controllable={false}
        resolveSelection={resolveSelection}
        onDelete={onDelete}
      >
        {restTreeNodes.map((node) => {
          const nodeId = getNodeId(node.entityId, node.modelPath);
          return (
            <TreeNode
              isExpanded
              key={nodeId}
              id={nodeId}
              label={node.id}
              onSelect={() => {
                onSelect({
                  entityId: node.entityId,
                  modelPath: node.modelPath,
                  ids: { primaryNodeId: node.primaryNodeId },
                });
              }}
            >
              {node.children?.map((child) => {
                const currentEntity = entities.find(
                  (entity) => entity.id === node.entityId && entity instanceof CamelRestVisualEntity,
                ) as CamelRestVisualEntity | undefined;
                const pathLabel = (
                  currentEntity !== undefined
                    ? (getValue(currentEntity.restDef, child.modelPath) as { path?: string } | undefined)
                    : undefined
                )?.path;
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
                      onSelect({
                        entityId: child.entityId,
                        modelPath: child.modelPath,
                        ids: { primaryNodeId: child.primaryNodeId },
                      });
                    }}
                  />
                );
              })}
            </TreeNode>
          );
        })}
      </EditorTree>
    </>
  );
};
