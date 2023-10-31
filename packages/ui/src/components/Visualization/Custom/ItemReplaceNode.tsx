import { AngleRightIcon } from '@patternfly/react-icons';
import { ContextMenuItem, ElementContext, ElementModel, GraphElement } from '@patternfly/react-topology';
import { FunctionComponent, useCallback, useContext } from 'react';
import { IDataTestID } from '../../../models';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../providers/entities.provider';
import { CanvasNode } from '../Canvas/canvas.models';

export const ItemReplaceNode: FunctionComponent<IDataTestID> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const element: GraphElement<ElementModel, CanvasNode['data']> = useContext(ElementContext);
  const vizNode = element.getData()?.vizNode;

  const onReplaceNode = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    /** Find compatible components */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(
      AddStepMode.ReplaceStep,
      vizNode.data,
    );

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    console.log(definedComponent);
    if (!definedComponent) return;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, AddStepMode.ReplaceStep);

    /** Update entity */
    entitiesContext.updateCodeFromEntities();
  }, [catalogModalContext, entitiesContext, vizNode]);

  return (
    <ContextMenuItem onClick={onReplaceNode} data-testid={props['data-testid']}>
      <AngleRightIcon /> Replace {vizNode?.data.label} node
    </ContextMenuItem>
  );
};
