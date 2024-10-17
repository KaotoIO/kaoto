import { TrashIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { IVisualizationNode, IVisualizationNodeData } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import {
  ACTION_ID_CONFIRM,
  ActionConfirmationModalContext,
} from '../../../../providers/action-confirmation-modal.provider';
import { EntitiesContextResult } from '../../../../hooks';

interface ItemDeleteStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  loadActionConfirmationModal: boolean;
}

export const deleteStep = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteModalContext: any,
  entitiesContext: EntitiesContextResult | null,
  vizNode: IVisualizationNode<IVisualizationNodeData>,
  loadActionConfirmationModal: boolean = false,
) => {
  if (loadActionConfirmationModal || (vizNode?.getChildren() ?? []).length > 0) {
    /** Open delete confirm modal, get the confirmation  */
    const isDeleteConfirmed = await deleteModalContext?.actionConfirmation({
      title: 'Permanently delete step?',
      text: 'Step and its children will be lost.',
    });

    if (isDeleteConfirmed !== ACTION_ID_CONFIRM) return;
  }

  vizNode?.removeChild();
  entitiesContext?.updateEntitiesFromCamelResource();
};

export const ItemDeleteStep: FunctionComponent<ItemDeleteStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const deleteModalContext = useContext(ActionConfirmationModalContext);

  const onRemoveNode = useCallback(async () => {
    deleteStep(deleteModalContext, entitiesContext, props.vizNode, props.loadActionConfirmationModal);
  }, [deleteModalContext, entitiesContext, props.loadActionConfirmationModal, props.vizNode]);

  return (
    <ContextMenuItem onClick={onRemoveNode} data-testid={props['data-testid']}>
      <TrashIcon /> Delete
    </ContextMenuItem>
  );
};
