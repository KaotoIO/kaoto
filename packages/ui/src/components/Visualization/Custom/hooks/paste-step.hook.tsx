import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ClipboardManager } from '../../../../utils/ClipboardManager';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { IClipboardCopyObject } from '../../../../models/visualization/clipboard';
import { ActionConfirmationModalContext } from '../../../../providers/action-confirmation-modal.provider';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { CamelComponentSchemaService } from '../../../../models/visualization/flows/support/camel-component-schema.service';
import { CamelRouteVisualEntityData } from '../../../../models/visualization/flows/support/camel-component-types';
import { isDefined } from '../../../../utils/is-defined';
import { useVisualizationController } from '@patternfly/react-topology';

export const usePasteStep = (vizNode: IVisualizationNode, mode: AddStepMode) => {
  const entitiesContext = useContext(EntitiesContext)!;
  const catalogModalContext = useContext(CatalogModalContext);
  const pasteModalContext = useContext(ActionConfirmationModalContext);
  const [isCompatible, setIsCompatible] = useState(false);
  const controller = useVisualizationController();

  /** validate compatibility of the clipboard node */
  const checkClipboardCompatibility = useCallback(
    (pastedNodeValue: IClipboardCopyObject | null): boolean => {
      if (!pastedNodeValue) return false;

      const pastedNodeType = pastedNodeValue.type;
      const baseNodeType = entitiesContext.camelResource.getType();
      const isSameType = pastedNodeType === baseNodeType;
      // Allow Route <-> Kamelet pasting
      const isCompatibleType =
        (pastedNodeType === SourceSchemaType.Route && baseNodeType === SourceSchemaType.Kamelet) ||
        (pastedNodeType === SourceSchemaType.Kamelet && baseNodeType === SourceSchemaType.Route);

      /** Validate the pasted node */
      if (!isSameType && !isCompatibleType) return false;
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
    const validate = async () => {
      try {
        await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
        const pastedNodeValue = await ClipboardManager.paste();
        const compatible = checkClipboardCompatibility(pastedNodeValue);
        setIsCompatible(compatible);
      } catch (error) {
        // fallback to allow pasting incase of permission issues (for Firefox or other browsers)
        setIsCompatible(true);
      }
    };

    validate();
  }, [checkClipboardCompatibility]);

  const onPasteStep = useCallback(async () => {
    const pastedNodeValue = await ClipboardManager.paste();
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

    /** Paste copied node to the entities */
    vizNode.pasteBaseEntityStep(pastedNodeValue, mode);

    // Set an empty model to clear the graph, Fixes an issue rendering child nodes incorrectly
    if (mode === AddStepMode.InsertSpecialChildStep) {
      const stepsProperties = CamelComponentSchemaService.getProcessorStepsProperties(
        (vizNode.data as CamelRouteVisualEntityData).processorName,
      );
      if (
        stepsProperties.some(
          (property) =>
            property.type === 'array-clause' &&
            property.name === pastedNodeValue.name &&
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
  }, [checkClipboardCompatibility, controller, entitiesContext, mode, pasteModalContext, vizNode]);

  const value = useMemo(
    () => ({
      onPasteStep,
      isCompatible,
    }),
    [isCompatible, onPasteStep],
  );

  return value;
};
