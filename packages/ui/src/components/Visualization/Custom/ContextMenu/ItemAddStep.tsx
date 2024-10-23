import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import {
  AddStepMode,
  IVisualizationNode,
  IVisualizationNodeData,
} from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { EntitiesContextResult } from '../../../../hooks';

interface ItemAddStepProps extends PropsWithChildren<IDataTestID> {
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep;
  vizNode: IVisualizationNode;
}

export const addNode = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catalogModalContext: any,
  entitiesContext: EntitiesContextResult | null,
  vizNode: IVisualizationNode<IVisualizationNodeData>,
  mode: AddStepMode = AddStepMode.AppendStep,
) => {
  if (!vizNode || !entitiesContext) return;

  /** Get compatible nodes and the location where can be introduced */
  const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(mode, vizNode.data);

  /** Open Catalog modal, filtering the compatible nodes */
  const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
  if (!definedComponent) return;

  /** Add new node to the entities */
  vizNode.addBaseEntityStep(definedComponent, mode);

  /** Update entity */
  entitiesContext.updateEntitiesFromCamelResource();
};

export const ItemAddStep: FunctionComponent<ItemAddStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);

  const onAddNode = useCallback(async () => {
    addNode(catalogModalContext, entitiesContext, props.vizNode, props.mode);
  }, [catalogModalContext, entitiesContext, props.mode, props.vizNode]);

  return (
    <ContextMenuItem onClick={onAddNode} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
