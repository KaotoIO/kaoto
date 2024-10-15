import { ContextMenuItem, SELECTION_EVENT, useVisualizationController } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../../models';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../../providers/entities.provider';

interface ItemAddStepProps extends PropsWithChildren<IDataTestID> {
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep;
  vizNode: IVisualizationNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findVisualizationNode(node: any, targetPath: string): IVisualizationNode | null {
  if (node?.data?.vizNode?.data?.path === targetPath) {
    return node.data.vizNode;
  }

  if (node?.children) {
    for (const child of node.children) {
      const result = findVisualizationNode(child, targetPath);
      if (result) return result;
    }
  }

  return null;
}

export const ItemAddStep: FunctionComponent<ItemAddStepProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const controller = useVisualizationController();

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

    setTimeout(() => {
      const result = props.vizNode.data.path
        ? findVisualizationNode(controller.getGraph(), props.vizNode.data.path)
        : null;
      controller.fireEvent(SELECTION_EVENT, [result?.getNextNode()?.id]);
    }, 200);
  }, [props.vizNode, props.mode, entitiesContext, catalogModalContext, controller]);

  return (
    <ContextMenuItem onClick={onAddNode} data-testid={props['data-testid']}>
      {props.children}
    </ContextMenuItem>
  );
};
