import { TrashIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../models';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { DeleteModalContext } from '../../../providers/delete-modal.provider';
import { EntitiesContext } from '../../../providers/entities.provider';

interface ItemDeleteGroupProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
}

export const ItemDeleteGroup: FunctionComponent<ItemDeleteGroupProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(DeleteModalContext);
  const flowId = props.vizNode?.getBaseEntity()?.getId();

  const onRemoveGroup = useCallback(async () => {
    /** Open delete confirm modal, get the confirmation  */
    const isDeleteConfirmed = await deleteModalContext?.deleteConfirmation({
      title: 'Permanently delete flow?',
      text: 'All steps will be lost.',
    });

    if (!isDeleteConfirmed) return;

    entitiesContext?.camelResource.removeEntity(flowId);
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [deleteModalContext, entitiesContext, flowId]);

  return (
    <ContextMenuItem onClick={onRemoveGroup} data-testid={props['data-testid']}>
      <TrashIcon /> Delete
    </ContextMenuItem>
  );
};
