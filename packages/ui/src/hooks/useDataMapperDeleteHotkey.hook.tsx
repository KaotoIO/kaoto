import hotkeys from 'hotkeys-js';
import { useCallback, useEffect, useMemo } from 'react';

import { DocumentTree } from '../models/datamapper/document-tree';
import { MappingActionKind } from '../models/datamapper/mapping-action';
import { TargetDocumentNodeData } from '../models/datamapper/visualization';
import { MappingActionService } from '../services/visualization/mapping-action.service';
import { TreeUIService } from '../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../store/document-tree.store';
import { useDataMapper } from './useDataMapper';

/**
 * Hook that enables Delete/Backspace hotkey support for removing selected mappings
 * in the DataMapper. When a target node with a mapping is selected and the user
 * presses Delete or Backspace, the mapping is removed and the selection is cleared.
 *
 * @param onUpdate - Callback to trigger a re-render after deletion
 */
export function useDataMapperDeleteHotkey(onUpdate: () => void) {
  const selectedNodePath = useDocumentTreeStore((state) => state.selectedNodePath);
  const selectedNodeIsSource = useDocumentTreeStore((state) => state.selectedNodeIsSource);
  const clearSelection = useDocumentTreeStore((state) => state.clearSelection);
  const { targetBodyDocument, mappingTree } = useDataMapper();

  // Create the target document tree
  const targetBodyNodeData = useMemo(
    () => new TargetDocumentNodeData(targetBodyDocument, mappingTree),
    [targetBodyDocument, mappingTree],
  );

  const targetBodyTree = useMemo<DocumentTree | undefined>(() => {
    return TreeUIService.createTree(targetBodyNodeData);
  }, [targetBodyNodeData]);

  const handleKeyDown = useCallback(() => {
    // Only handle deletions on target nodes (not source nodes)
    if (!selectedNodePath || selectedNodeIsSource || !targetBodyTree) return;

    // Find the selected tree node by path
    const treeNode = targetBodyTree.findNodeByPath(selectedNodePath);
    if (!treeNode) return;

    // Get the node data from the tree node
    const selectedNode = treeNode.nodeData as TargetDocumentNodeData;
    if (!selectedNode) return;

    // Check if deletion is allowed for this node
    const allowedActions = new Set(MappingActionService.getAllowedActions(selectedNode));
    if (!allowedActions.has(MappingActionKind.Delete)) return;

    // Delete the mapping
    MappingActionService.deleteMappingItem(selectedNode);

    // Clear selection and trigger update
    clearSelection();
    onUpdate();
  }, [selectedNodePath, selectedNodeIsSource, targetBodyTree, clearSelection, onUpdate]);

  useEffect(() => {
    hotkeys.filter = (event) => {
      const target = event.target as HTMLElement;
      const tagName = target.tagName;
      // Allow hotkey unless user is typing in an input field
      return !(tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable);
    };

    hotkeys('Delete, backspace', (event) => {
      event.preventDefault();
      handleKeyDown();
    });

    return () => {
      hotkeys.unbind('Delete, backspace');
    };
  }, [handleKeyDown]);
}
