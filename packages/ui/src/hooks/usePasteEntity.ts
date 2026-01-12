import { ButtonVariant } from '@patternfly/react-core';
import { cloneDeep } from 'lodash';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { EntityType } from '../models/camel/entities';
import { IClipboardCopyObject } from '../models/visualization/clipboard';
import { ACTION_ID_CONFIRM, ActionConfirmationModalContext } from '../providers/action-confirmation-modal.provider';
import { EntitiesContext } from '../providers/entities.provider';
import { VisibleFlowsContext } from '../providers/visible-flows.provider';
import { ClipboardManager } from '../utils/ClipboardManager';
import { updateIds } from '../utils/update-ids';

/**
 * Map from clipboard entity name to EntityType for pasting
 */
const ENTITY_NAME_TO_TYPE: Record<string, EntityType> = {
  route: EntityType.Route,
  from: EntityType.Route,
  onException: EntityType.OnException,
  errorHandler: EntityType.ErrorHandler,
  rest: EntityType.Rest,
  restConfiguration: EntityType.RestConfiguration,
  routeConfiguration: EntityType.RouteConfiguration,
  intercept: EntityType.Intercept,
  interceptFrom: EntityType.InterceptFrom,
  interceptSendToEndpoint: EntityType.InterceptSendToEndpoint,
  onCompletion: EntityType.OnCompletion,
  beans: EntityType.Beans,
};

/**
 * Hook to handle pasting entities from clipboard at the canvas level
 */
export const usePasteEntity = () => {
  const entitiesContext = useContext(EntitiesContext)!;
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  const actionConfirmationContext = useContext(ActionConfirmationModalContext);
  const [canPaste, setCanPaste] = useState(false);

  /**
   * Check if clipboard content is compatible with current resource type
   */
  const checkEntityCompatibility = useCallback(
    (clipboardContent: IClipboardCopyObject | null): boolean => {
      if (!clipboardContent) return false;

      const resourceType = entitiesContext.camelResource.getType();
      return clipboardContent.type === resourceType;
    },
    [entitiesContext.camelResource],
  );

  /**
   * Check clipboard compatibility on mount and when resource changes
   * Falls back to allowing paste for Firefox (permission issues)
   */
  useEffect(() => {
    const validateClipboard = async () => {
      try {
        await navigator.permissions.query({ name: 'clipboard-read' as PermissionName });
        const clipboardContent = await ClipboardManager.paste();
        const compatible = checkEntityCompatibility(clipboardContent);
        setCanPaste(compatible);
      } catch {
        // Fallback to allow pasting in case of permission issues (Firefox or other browsers)
        setCanPaste(true);
      }
    };

    validateClipboard();
  }, [checkEntityCompatibility]);

  /**
   * Paste entity from clipboard
   */
  const pasteEntity = useCallback(async () => {
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
    const compatible = checkEntityCompatibility(clipboardContent);
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

    // Determine the entity type from the clipboard content
    const entityType = ENTITY_NAME_TO_TYPE[updatedContent.name] ?? EntityType.Route;

    // Add the new entity
    const newId = camelResource.addNewEntity(entityType, {
      [updatedContent.name]: updatedContent.definition,
    });

    // Make the new entity visible
    if (newId) {
      visibleFlowsContext.visualFlowsApi.toggleFlowVisible(newId);
    }

    // Update entities in context
    entitiesContext.updateEntitiesFromCamelResource();
  }, [actionConfirmationContext, checkEntityCompatibility, entitiesContext, visibleFlowsContext.visualFlowsApi]);

  return useMemo(
    () => ({
      canPaste,
      pasteEntity,
    }),
    [canPaste, pasteEntity],
  );
};
