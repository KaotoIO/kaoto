import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { IClipboardCopyObject } from './copy-step.hook';

export const usePasteStep = (vizNode: IVisualizationNode, mode: AddStepMode) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const catalogModalContext = useContext(CatalogModalContext);
  const [isCompatible, setIsCompatible] = useState(false);
  const permissionName = 'clipboard-read' as PermissionName;

  /** validate compatibility of the clipboard node */
  const checkClipboardCompatibility = useCallback(
    (pastedNodeValue: IClipboardCopyObject | null): boolean => {
      if (!pastedNodeValue) return false;

      const pastedNodeType = pastedNodeValue.type;
      const baseNodeType = entitiesContext.camelResource.getType();
      const isSameType = pastedNodeType === baseNodeType;

      /** Validate the pasted node */
      if (!isSameType) return false;
      /** Get compatible nodes and the location where can be introduced */
      const filter = entitiesContext.camelResource.getCompatibleComponents(
        mode,
        vizNode.data,
        vizNode.getComponentSchema()?.definition,
      );

      /** Check paste compatibility */
      return catalogModalContext?.checkCompatibility(pastedNodeValue.name, filter) ?? false;
    },
    [catalogModalContext, entitiesContext, mode, vizNode],
  );

  /** Compatibility check on effect */
  useEffect(() => {
    const validate = () => {
      navigator.permissions
        .query({ name: permissionName })
        .then(async () => {
          const pastedNodeValue = await ClipboardManager.paste();
          const compatible = checkClipboardCompatibility(pastedNodeValue);
          setIsCompatible(compatible);
        })
        .catch(() => {
          // fallback to allow pasting incase of permission issues (for Firefox or other browsers)
          setIsCompatible(true);
        });
    };

    validate();
  }, [checkClipboardCompatibility]);

  const onPasteStep = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    const pastedNodeValue = await ClipboardManager.paste();
    if (!pastedNodeValue) return;

    navigator.permissions.query({ name: permissionName }).catch(() => {
      const compatible = checkClipboardCompatibility(pastedNodeValue);
      if (!compatible) {
        alert('Pasted node is not compatible with the current context.');
        return;
      }
    });
    /** Paste copied node to the entities */
    vizNode.pasteBaseEntityStep(pastedNodeValue, mode);
    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [checkClipboardCompatibility, entitiesContext, mode, vizNode]);

  const value = useMemo(
    () => ({
      onPasteStep,
      isCompatible,
    }),
    [isCompatible, onPasteStep],
  );

  return value;
};
