import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';

export const usePasteStep = (vizNode: IVisualizationNode, mode: AddStepMode) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const catalogModalContext = useContext(CatalogModalContext);
  const [isCompatible, setIsCompatible] = useState(false);

  useEffect(() => {
    const checkCompatibility = async () => {
      const pastedNodeValue = await ClipboardManager.paste();
      if (pastedNodeValue) {
        const pastedNodeType = pastedNodeValue.type;
        const baseNodeType = entitiesContext.camelResource.getType();
        const isSameType = pastedNodeType === baseNodeType;

        /** Validate the pasted node */
        if (isSameType) {
          /** Get compatible nodes and the location where can be introduced */
          const filter = entitiesContext.camelResource.getCompatibleComponents(
            mode,
            vizNode.data,
            vizNode.getComponentSchema()?.definition,
          );

          /** Check paste compatibility */
          const compatibility = catalogModalContext?.checkCompatibility(pastedNodeValue.name, filter) ?? false;

          setIsCompatible(compatibility);
          return;
        }
      }

      setIsCompatible(false);
    };

    checkCompatibility();
  }, [entitiesContext, catalogModalContext, mode, vizNode]);

  const onPasteStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    const pastedNodeValue = await ClipboardManager.paste();
    if (pastedNodeValue) {
      /** Paste copied node to the entities */
      vizNode.pasteBaseEntityStep(pastedNodeValue, mode);
      /** Update entity */
      entitiesContext.updateEntitiesFromCamelResource();
    }
  }, [entitiesContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onPasteStep,
      isCompatible,
    }),
    [isCompatible, onPasteStep],
  );

  return value;
};
