import { SyncAltIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { ActionConfirmationModalContext } from '../../../../providers/action-confirmation-modal.provider';

interface ItemReplaceStepProps extends PropsWithChildren<IDataTestID> {
  vizNode: IVisualizationNode;
  loadActionConfirmationModal: boolean;
}

export const ItemReplaceStep: FunctionComponent<ItemReplaceStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const replaceModalContext = useContext(ActionConfirmationModalContext);

  const onReplaceNode = useCallback(async () => {
    if (!props.vizNode || !entitiesContext) return;

    if (props.loadActionConfirmationModal) {
      /** Open delete confirm modal, get the confirmation  */
      const isReplaceConfirmed = await replaceModalContext?.actionConfirmation({
        title: 'Replace step?',
        text: 'Step and its children will be lost.',
      });

      if (!isReplaceConfirmed) return;
    }

    /** Find compatible components */
    const catalogFilter = entitiesContext.camelResource.getCompatibleComponents(
      AddStepMode.ReplaceStep,
      props.vizNode.data,
    );

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(catalogFilter);
    if (!definedComponent) return;

    /** Add new node to the entities */
    props.vizNode.addBaseEntityStep(definedComponent, AddStepMode.ReplaceStep);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [replaceModalContext, catalogModalContext, entitiesContext, props.vizNode]);

  return (
    <ContextMenuItem onClick={onReplaceNode} data-testid={props['data-testid']}>
      <SyncAltIcon /> Replace
    </ContextMenuItem>
  );
};
