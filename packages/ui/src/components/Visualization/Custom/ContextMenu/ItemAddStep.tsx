import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';

interface ItemAddStepProps extends PropsWithChildren<IDataTestID> {
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep;
  vizNode: IVisualizationNode;
}

export const ItemAddStep: FunctionComponent<ItemAddStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);

  const onAddNode = useCallback(async () => {
    if (!props.vizNode || !entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(props.mode, props.vizNode.data);

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;

    /** Add new node to the entities */
    props.vizNode.addBaseEntityStep(definedComponent, props.mode);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [catalogModalContext, entitiesContext, props.mode, props.vizNode]);

  return (
    <ContextMenuItem onClick={onAddNode} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
