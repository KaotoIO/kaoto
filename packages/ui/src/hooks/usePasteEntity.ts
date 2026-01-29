import { ButtonVariant } from '@patternfly/react-core';
import { cloneDeep } from 'lodash';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { EntityType } from '../models/camel/entities';
import { SourceSchemaType } from '../models/camel/source-schema-type';
import { IClipboardCopyObject } from '../models/visualization/clipboard';
import { ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../providers/entities.provider';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';
import { ClipboardManager } from '../utils/ClipboardManager';
import { updateIds } from '../utils/update-ids';

/**
 * Hook to handle pasting entities from clipboard at the canvas level
 */
export const usePasteEntity = () => {
  const entitiesContext = useContext(EntitiesContext);
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  const actionConfirmationContext = useContext(ActionConfirmationModalContext);
  const [isCompatible, setIsCompatible] = useState(false);

  /**
   * Check if clipboard content is compatible with current resource type
   */
  const checkClipboardCompatibility = useCallback(
    (pastedEntityValue: IClipboardCopyObject | null): boolean => {
      if (!pastedEntityValue || !entitiesContext) return false;

      const pastedEntityType = pastedEntityValue.type;
      const resourceType = entitiesContext.camelResource.getType();
      const isSameType = pastedEntityType === resourceType;

      if (
        resourceType === SourceSchemaType.Route &&
        CamelRouteResource.SUPPORTED_ENTITIES.some((entity) => pastedEntityValue.name === entity.type)
      ) {
        return true;
      }

      return isSameType;
    },
    [entitiesContext],
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

  /**
   * Paste entity from clipboard
   */
  const onPasteEntity = useCallback(async () => {
    if (!entitiesContext) return;
    const clipboardContent = await ClipboardManager.paste();

    if (!clipboardContent) {
      await actionConfirmationContext?.actionConfirmation({
        title: 'Invalid Paste Action',
        text: 'No valid content found in clipboard.',
        buttonOptions: {},
      });
      return;
    }

    // Validate compatibility
    const compatible = checkClipboardCompatibility(clipboardContent);
    if (!compatible) {
      await actionConfirmationContext?.actionConfirmation({
        title: 'Invalid Paste Action',
        text: 'Pasted entity is not compatible with the current resource type.',
        buttonOptions: {},
      });
      return;
    }

    const camelResource = entitiesContext.camelResource;
    const supportsMultiple = camelResource.supportsMultipleVisualEntities();

    // For single-entity resources (Kamelet, Pipe), ask if user wants to replace
    if (!supportsMultiple) {
      const existingEntities = camelResource.getVisualEntities();
      if (existingEntities.length > 0) {
        const result = await actionConfirmationContext?.actionConfirmation({
          title: 'Replace Existing Entity?',
          text: 'This resource type supports only one entity. Do you want to replace the existing entity?',
          buttonOptions: {
            [ACTION_ID_CONFIRM]: {
              buttonText: 'Replace',
              variant: ButtonVariant.primary,
            },
          },
        });

        if (result !== ACTION_ID_CONFIRM) {
          return;
        }

        // Remove existing entities
        const existingIds = existingEntities.map((entity) => entity.id);
        camelResource.removeEntity(existingIds);
      }
    }

    // Clone and update IDs to prevent duplication
    const updatedContent = updateIds(cloneDeep(clipboardContent));

    // Add the new entity
    const newId = camelResource.addNewEntity(updatedContent.name as EntityType, {
      [updatedContent.name]: updatedContent.definition,
    });

    // Make the new entity visible
    if (newId) {
      visibleFlowsContext.visualFlowsApi.toggleFlowVisible(newId);
    }

    // Update entities in context
    entitiesContext.updateEntitiesFromCamelResource();
  }, [actionConfirmationContext, checkClipboardCompatibility, entitiesContext, visibleFlowsContext.visualFlowsApi]);

  return useMemo(
    () => ({
      isCompatible,
      onPasteEntity,
    }),
    [isCompatible, onPasteEntity],
  );
};
