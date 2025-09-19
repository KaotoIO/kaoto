import { useCallback, useEffect } from 'react';
import hotkeys from 'hotkeys-js';
import { useDeleteStep } from './delete-step.hook';
import { IVisualizationNode } from '../../../../models';

export default function useDeleteHotkey(selectedVizNode: IVisualizationNode | undefined, clearSelected: () => void) {
  const { onDeleteStep } = useDeleteStep(selectedVizNode);
  const handleKeyDown = useCallback(() => {
    if (!selectedVizNode) return;

    const { canRemoveStep, canRemoveFlow } = selectedVizNode.getNodeInteraction();
    if (!canRemoveStep && !canRemoveFlow) {
      return;
    }

    onDeleteStep();
    clearSelected();
  }, [onDeleteStep, selectedVizNode, clearSelected]);

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
