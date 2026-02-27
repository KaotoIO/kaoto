import { useCallback, useContext, useState } from 'react';

import { getCamelRandomId } from '../../../camel-utils/camel-random-id';
import { EntityType } from '../../../models/camel/entities';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { EntitiesContext } from '../../../providers';
import {
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../providers/action-confirmation-modal.provider';
import { RestEditorSelection, RestVerb } from '../restDslTypes';

interface UseRestDslOperationsProps {
  restEntities: CamelRestVisualEntity[];
  restConfiguration: CamelRestConfigurationVisualEntity | undefined;
  canAddRestEntities: boolean;
  canDeleteRestEntities: boolean;
  setSelection: (selection: RestEditorSelection | undefined) => void;
}

export const useRestDslOperations = ({
  restEntities,
  restConfiguration,
  canAddRestEntities,
  canDeleteRestEntities,
  setSelection,
}: UseRestDslOperationsProps) => {
  const entitiesContext = useContext(EntitiesContext);
  const actionConfirmation = useContext(ActionConfirmationModalContext);

  const [isAddOperationOpen, setIsAddOperationOpen] = useState(false);
  const [addOperationRestId, setAddOperationRestId] = useState<string | undefined>(undefined);

  const confirmDelete = useCallback(
    async (title: string, text: string) => {
      if (!actionConfirmation) {
        return globalThis.confirm(text);
      }

      const result = await actionConfirmation.actionConfirmation({
        title,
        text,
      });
      return result === ACTION_ID_CONFIRM;
    },
    [actionConfirmation],
  );

  const handleCreateRestConfiguration = useCallback(() => {
    if (!entitiesContext || !canAddRestEntities || restConfiguration) return;

    const camelResource = entitiesContext.camelResource as { addNewEntity: (type?: EntityType) => string };
    camelResource.addNewEntity(EntityType.RestConfiguration);
    entitiesContext.updateEntitiesFromCamelResource();
    setSelection({ kind: 'restConfiguration' });
  }, [canAddRestEntities, entitiesContext, restConfiguration, setSelection]);

  const handleCreateRest = useCallback(() => {
    if (!entitiesContext || !canAddRestEntities) return;

    const camelResource = entitiesContext.camelResource as { addNewEntity: (type?: EntityType) => string };
    const newId = camelResource.addNewEntity(EntityType.Rest);
    entitiesContext.updateEntitiesFromCamelResource();
    if (newId) {
      setSelection({ kind: 'rest', restId: newId });
    }
  }, [canAddRestEntities, entitiesContext, setSelection]);

  const openAddOperationModal = useCallback((restId: string) => {
    setAddOperationRestId(restId);
    setIsAddOperationOpen(true);
  }, []);

  const closeAddOperationModal = useCallback(() => {
    setIsAddOperationOpen(false);
    setAddOperationRestId(undefined);
  }, []);

  const handleCreateOperation = useCallback(
    (restId: string, verb: RestVerb, operationId: string, operationPath: string) => {
      if (!entitiesContext) return;
      const restEntity = restEntities.find((entity) => entity.id === restId);
      if (!restEntity) return;

      const restDefinition = restEntity.restDef.rest ?? {};
      const operations = (restDefinition as Record<string, unknown>)[verb] as Record<string, unknown>[] | undefined;
      const normalizedOperations = operations ? [...operations] : [];
      const resolvedId = operationId.trim() || getCamelRandomId(verb);

      normalizedOperations.push({
        id: resolvedId,
        path: operationPath.trim() || '/',
        to: {
          uri: `direct:${resolvedId}`,
        },
      });

      (restDefinition as Record<string, unknown>)[verb] = normalizedOperations;
      restEntity.updateModel(restEntity.getRootPath(), restDefinition);
      entitiesContext.updateEntitiesFromCamelResource();

      setSelection({
        kind: 'operation',
        restId,
        verb,
        index: normalizedOperations.length - 1,
      });
      closeAddOperationModal();
    },
    [closeAddOperationModal, entitiesContext, restEntities, setSelection],
  );

  const handleDeleteRestConfiguration = useCallback(async () => {
    if (!entitiesContext || !restConfiguration || !canDeleteRestEntities) return;
    const shouldDelete = await confirmDelete('Delete Rest Configuration', 'This will remove the Rest Configuration.');
    if (!shouldDelete) return;

    const camelResource = entitiesContext.camelResource as { removeEntity: (ids?: string[]) => void };
    camelResource.removeEntity([restConfiguration.id]);
    entitiesContext.updateEntitiesFromCamelResource();
    setSelection(undefined);
  }, [canDeleteRestEntities, confirmDelete, entitiesContext, restConfiguration, setSelection]);

  const handleDeleteRest = useCallback(
    async (restEntity: CamelRestVisualEntity) => {
      if (!entitiesContext || !canDeleteRestEntities) return;
      const label = restEntity.restDef?.rest?.path || restEntity.id;
      const shouldDelete = await confirmDelete('Delete Rest Element', `This will remove ${label}.`);
      if (!shouldDelete) return;

      const camelResource = entitiesContext.camelResource as { removeEntity: (ids?: string[]) => void };
      camelResource.removeEntity([restEntity.id]);
      entitiesContext.updateEntitiesFromCamelResource();
      setSelection(undefined);
    },
    [canDeleteRestEntities, confirmDelete, entitiesContext, setSelection],
  );

  const handleDeleteOperation = useCallback(
    async (restEntity: CamelRestVisualEntity, verb: RestVerb, index: number) => {
      if (!entitiesContext) return;
      const restDefinition = restEntity.restDef.rest ?? {};
      const operations = (restDefinition as Record<string, unknown>)[verb] as Record<string, unknown>[] | undefined;
      if (!operations?.[index]) return;
      const pathLabel = (operations[index] as { path?: string }).path ?? '';
      const shouldDelete = await confirmDelete(
        'Delete Operation',
        `This will remove ${verb.toUpperCase()} ${pathLabel || ''}.`,
      );
      if (!shouldDelete) return;

      const updated = operations.filter((_operation, idx) => idx !== index);
      if (updated.length === 0) {
        delete (restDefinition as Record<string, unknown>)[verb];
      } else {
        (restDefinition as Record<string, unknown>)[verb] = updated;
      }

      restEntity.updateModel(restEntity.getRootPath(), restDefinition);
      entitiesContext.updateEntitiesFromCamelResource();
      setSelection(undefined);
    },
    [confirmDelete, entitiesContext, setSelection],
  );

  return {
    isAddOperationOpen,
    addOperationRestId,
    openAddOperationModal,
    closeAddOperationModal,
    handleCreateOperation,
    handleCreateRestConfiguration,
    handleCreateRest,
    handleDeleteRestConfiguration,
    handleDeleteRest,
    handleDeleteOperation,
  };
};
