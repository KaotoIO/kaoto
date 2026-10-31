import { FlattenedNode } from '../../models/datamapper/document-tree';
import { MappingItem } from '../../models/datamapper/mapping';
import { MappingNodeData, TargetFieldNodeData } from '../../models/datamapper/visualization';

const mappingRowKeys = new WeakMap<MappingItem, number>();
let nextMappingRowKey = 0;

const getMappingRowKey = (mapping: MappingItem): string => {
  let key = mappingRowKeys.get(mapping);
  if (key === undefined) {
    key = nextMappingRowKey;
    nextMappingRowKey += 1;
    mappingRowKeys.set(mapping, key);
  }
  return `m:${key}`;
};

/**
 * Keys for the target tree's rows that survive a rebuild. A row showing a mapping item is keyed by
 * the item's identity, which promoting or demoting an optional guard, or adding or removing one, does
 * not change, while the row's visual path does. Keeping the key keeps the row's DOM, so focus and the
 * XPath editor's return target survive a structural commit. Other rows are keyed by their visual
 * path, and an item rendered twice keeps its identity key only for its first row.
 * @param flattenedNodes - the rows in display order
 * @returns one key per row, in the same order
 */
export const getTargetRowKeys = (flattenedNodes: FlattenedNode[]): string[] => {
  const usedKeys = new Set<string>();
  const keys: string[] = [];
  for (const { treeNode, path } of flattenedNodes) {
    const { nodeData } = treeNode;
    const mapping =
      nodeData instanceof MappingNodeData || nodeData instanceof TargetFieldNodeData ? nodeData.mapping : undefined;
    let key = mapping ? getMappingRowKey(mapping) : `p:${path}`;
    if (usedKeys.has(key)) key = `p:${path}`;
    usedKeys.add(key);
    keys.push(key);
  }
  return keys;
};
