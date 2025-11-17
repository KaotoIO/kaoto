import hotkeys from 'hotkeys-js';
import { useCallback, useEffect } from 'react';

import { IVisualizationNode } from '../../../../models';
import { useDeleteGroup } from './delete-group.hook';
import { useDeleteStep } from './delete-step.hook';

export default function useDeleteHotkey(selectedVizNode: IVisualizationNode | undefined, clearSelected: () => void) {
  const { onDeleteStep } = useDeleteStep(selectedVizNode);
  const { onDeleteGroup } = useDeleteGroup(selectedVizNode);

  const handleKeyDown = useCallback(() => {
    if (!selectedVizNode) return;

    const { canRemoveStep, canRemoveFlow } = selectedVizNode.getNodeInteraction();
    if (!canRemoveStep && !canRemoveFlow) return;

    if (canRemoveStep) onDeleteStep();

    if (canRemoveFlow) onDeleteGroup();

    clearSelected();
  }, [onDeleteStep, onDeleteGroup, selectedVizNode, clearSelected]);

  useEffect(() => {
    hotkeys('Delete, backspace', (event) => {
      event.preventDefault();
      handleKeyDown();
    });

    return () => {
      hotkeys.unbind('Delete, backspace');
    };
  }, [handleKeyDown]);
}
