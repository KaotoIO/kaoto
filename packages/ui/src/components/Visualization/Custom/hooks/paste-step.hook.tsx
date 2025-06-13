import { useCallback, useContext, useMemo } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { DefinedComponent } from '../../../../models/camel-catalog-index';

export const usePasteStep = (
  vizNode: IVisualizationNode,
  mode:
    | AddStepMode.InsertChildStep
    | AddStepMode.InsertSpecialChildStep
    | AddStepMode.AppendStep = AddStepMode.AppendStep,
) => {
  const entitiesContext = useContext(EntitiesContext);

  const onPasteStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    try {
      const pastedNodeValue = ClipboardManager.paste();
      if (pastedNodeValue) {
        /** Add new node to the entities */
        vizNode.addBaseEntityStep(pastedNodeValue as DefinedComponent, mode);
        /** Update entity */
        entitiesContext.updateEntitiesFromCamelResource();
      }
    } catch (err) {
      console.error('Failed to paste step:', err);
    }
  }, [entitiesContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onPasteStep: onPasteStep,
    }),
    [onPasteStep],
  );

  return value;
};
