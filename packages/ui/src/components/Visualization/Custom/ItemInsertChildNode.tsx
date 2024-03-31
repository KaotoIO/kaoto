import { AngleDoubleDownIcon } from '@patternfly/react-icons';
import { ContextMenuItem, ElementContext, ElementModel, GraphElement } from '@patternfly/react-topology';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { IDataTestID } from '../../../models';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../providers/entities.provider';
import { CanvasNode } from '../Canvas/canvas.models';

interface ItemInsertChildNodeProps extends IDataTestID {
  mode: AddStepMode.InsertChildStep | AddStepMode.InsertSpecialChildStep;
}

export const ItemInsertChildNode: FunctionComponent<ItemInsertChildNodeProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const element: GraphElement<ElementModel, CanvasNode['data']> = useContext(ElementContext);
  const vizNode = element.getData()?.vizNode;
  const shouldRender = useMemo(() => {
    const nodeInteractions = vizNode?.getNodeInteraction() ?? { canHaveChildren: false, canHaveSpecialChildren: false };

    return props.mode === AddStepMode.InsertChildStep
      ? nodeInteractions.canHaveChildren
      : nodeInteractions.canHaveSpecialChildren;
  }, [props.mode, vizNode]);

  const onInsertNode = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(
      props.mode,
      vizNode.data,
      vizNode.getComponentSchema()?.definition,
    );

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;
    const targetProperty = props.mode === AddStepMode.InsertChildStep ? 'steps' : undefined;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, props.mode, targetProperty);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [catalogModalContext, entitiesContext, props.mode, vizNode]);

  return shouldRender ? (
    <ContextMenuItem onClick={onInsertNode} data-testid={props['data-testid']}>
      <AngleDoubleDownIcon /> Insert {props.mode === AddStepMode.InsertSpecialChildStep ? 'special' : ''} step
    </ContextMenuItem>
  ) : null;
};
