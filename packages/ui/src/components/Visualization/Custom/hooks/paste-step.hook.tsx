import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';
import { useVisualizationController } from '@patternfly/react-topology';
import { cloneDeep } from 'lodash';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { CatalogModalContext } from '../../../../dynamic-catalog/catalog-modal.provider';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { IClipboardContent } from '../../../../models/visualization/clipboard';
import { CamelComponentSchemaService } from '../../../../models/visualization/flows/support/camel-component-schema.service';
import { ActionConfirmationModalContext } from '../../../../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ClipboardService } from '../../../../services/visualization/clipboard.service';
import { updateIds } from '../../../../utils/update-ids';
import { IInteractionType, IOnPasteAddon } from '../../../registers/interactions/node-interaction-addon.model';
import { NodeInteractionAddonContext } from '../../../registers/interactions/node-interaction-addon.provider';
import { processOnPasteAddon } from '../ContextMenu/item-interaction-helper';

export const usePasteStep = (vizNode: IVisualizationNode, mode: AddStepMode) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const catalogModalContext = useContext(CatalogModalContext);
  const pasteModalContext = useContext(ActionConfirmationModalContext);
  const nodeInteractionAddonContext = useContext(NodeInteractionAddonContext);
  const [isCompatible, setIsCompatible] = useState(false);
  const clipboardCacheRef = useRef<IClipboardContent | null | undefined>(undefined);
  const controller = useVisualizationController();

  /** validate compatibility of the clipboard node */
  const checkClipboardCompatibility = useCallback(
    (pastedNodeValue: IClipboardContent | null): boolean => {
      if (!pastedNodeValue) return false;
      const filter = entitiesContext.camelResource.getCompatibleComponents(
        mode,
        vizNode.data,
        vizNode.getNodeDefinition(),
      );
      return catalogModalContext?.checkCompatibility(pastedNodeValue.name, filter) ?? false;
    },
    [catalogModalContext, entitiesContext, mode, vizNode],
  );

  /** Compatibility check on effect */
  useEffect(() => {
    let cancelled = false;
    clipboardCacheRef.current = undefined;
    const validate = async () => {
      try {
        await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
        const pastedNodeValue = await ClipboardService.paste();
        if (!cancelled) {
          clipboardCacheRef.current = pastedNodeValue;
          const updatedNodeValue = updateIds(cloneDeep(pastedNodeValue));
          setIsCompatible(checkClipboardCompatibility(updatedNodeValue));
        }
      } catch (error) {
        // fallback to allow pasting in case of permission issues (for Firefox or other browsers)
        console.warn('Clipboard permission check failed, falling back to optimistic paste:', error);
        if (!cancelled) {
          clipboardCacheRef.current = null;
          setIsCompatible(true);
        }
      }
    };

    void validate();
    return () => {
      cancelled = true;
    };
  }, [checkClipboardCompatibility]);

  const onPasteStep = useCallback(async () => {
    const pastedNodeValue = clipboardCacheRef.current ?? null;
    if (!vizNode || !entitiesContext || !pastedNodeValue) return;

    const compatible = checkClipboardCompatibility(pastedNodeValue);
    if (!compatible) {
      /** Open the modal with the invalid paste action information  */
      await pasteModalContext?.actionConfirmation({
        title: 'Invalid Paste Action',
        text: 'Pasted node is not compatible with the current context.',
        buttonOptions: {},
      });
      return;
    }

    const originalContent = cloneDeep(pastedNodeValue);
    const updatedContent = updateIds(cloneDeep(pastedNodeValue));

    await processOnPasteAddon(
      vizNode,
      originalContent,
      updatedContent,
      () => nodeInteractionAddonContext.getRegisteredInteractionAddons(IInteractionType.ON_PASTE) as IOnPasteAddon[],
    );

    /** Paste copied node to the entities */
    vizNode.pasteBaseEntityStep(updatedContent, mode);

    // Set an empty model to clear the graph, Fixes an issue rendering child nodes incorrectly
    if (mode === AddStepMode.InsertSpecialChildStep) {
      const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
        vizNode.data.primaryNodeId?.name as keyof ProcessorDefinition,
      );
      if (
        stepsProperties.some(
          (property) =>
            property.type === 'array-clause' &&
            property.name === updatedContent.name &&
            isDefined(vizNode.getChildren()),
        )
      ) {
        controller.fromModel({
          nodes: [],
          edges: [],
        });
      }
    }

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [
    checkClipboardCompatibility,
    controller,
    entitiesContext,
    mode,
    nodeInteractionAddonContext,
    pasteModalContext,
    vizNode,
  ]);

  const value = useMemo(
    () => ({
      onPasteStep,
      isCompatible,
    }),
    [isCompatible, onPasteStep],
  );

  return value;
};
