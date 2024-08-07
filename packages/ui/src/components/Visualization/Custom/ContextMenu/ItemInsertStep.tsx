import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';

interface ItemInsertStepProps extends PropsWithChildren<IDataTestID> {
  mode: AddStepMode.InsertChildStep | AddStepMode.InsertSpecialChildStep;
  vizNode: IVisualizationNode;
}

export const ItemInsertStep: FunctionComponent<ItemInsertStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);

  const onInsertNode = useCallback(async () => {
    if (!props.vizNode || !entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(
      props.mode,
      props.vizNode.data,
      props.vizNode.getComponentSchema()?.definition,
    );

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;
    const targetProperty = props.mode === AddStepMode.InsertChildStep ? 'steps' : undefined;

    /** Add new node to the entities */
    props.vizNode.addBaseEntityStep(definedComponent, props.mode, targetProperty);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [catalogModalContext, entitiesContext, props.mode, props.vizNode]);

  return (
    <ContextMenuItem onClick={onInsertNode} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
