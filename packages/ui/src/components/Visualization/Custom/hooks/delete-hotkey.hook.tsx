import hotkeys from 'hotkeys-js';
import { useCallback, useEffect } from 'react';

import { IVisualizationNode } from '../../../../models';
import { useDeleteGroup } from './delete-group.hook';
import { useDeleteStep } from './delete-step.hook';

/**
 * Registers Delete and Backspace hotkeys to delete the currently selected visualization node.
 * Clears the selection after a successful deletion.
 */
export default function useDeleteHotkey(selectedVizNode: IVisualizationNode | undefined, clearSelected: () => void) {
  const { onDeleteStep } = useDeleteStep(selectedVizNode);
  const { onDeleteGroup } = useDeleteGroup(selectedVizNode);

  const handleKeyDown = useCallback(async () => {
    if (!selectedVizNode) return;

    const { canRemoveStep, canRemoveFlow } = selectedVizNode.getNodeInteraction();
    if (!canRemoveStep && !canRemoveFlow) return;

    try {
      if (canRemoveStep) await onDeleteStep();

      if (canRemoveFlow) await onDeleteGroup();

      clearSelected();
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  }, [onDeleteStep, onDeleteGroup, selectedVizNode, clearSelected]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      event.preventDefault();
      handleKeyDown().catch((error) => {
        console.error('Failed to handle delete hotkey:', error);
      });
    };

    hotkeys('Delete, backspace', handler);

    return () => {
      hotkeys.unbind('Delete, backspace', handler);
    };
  }, [handleKeyDown]);
}
