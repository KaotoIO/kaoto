import { useCallback, useContext, useMemo } from 'react';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { IInteractionType } from '../../../registers/interactions/node-interaction-addon.model';
import { processOnCopyAddonRecursively } from '../ContextMenu/item-interaction-helper';

export const useCopyStep = (vizNode: IVisualizationNode) => {
  const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);

  const onCopyStep = useCallback(async () => {
    let copiedNodeContent = vizNode.getCopiedContent();

    if (!copiedNodeContent) return;

    copiedNodeContent = processOnCopyAddonRecursively(vizNode, copiedNodeContent, (vizNode) =>
      nodeInteractionAddonContext.getRegisteredInteractionAddons(IInteractionType.ON_COPY, vizNode),
    );

    /** Copy the node model */
    if (copiedNodeContent) {
      ClipboardManager.copy(copiedNodeContent);
    }
  }, [nodeInteractionAddonContext, vizNode]);

  const value = useMemo(
    () => ({
      onCopyStep: onCopyStep,
    }),
    [onCopyStep],
  );

  return value;
};
