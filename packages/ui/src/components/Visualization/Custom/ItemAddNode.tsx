import { AngleDownIcon, AngleUpIcon } from '@patternfly/react-icons';
import { ContextMenuItem, ElementContext, ElementModel, GraphElement } from '@patternfly/react-topology';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { IDataTestID } from '../../../models';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CatalogModalContext } from '../../../providers/catalog-modal.provider';
import { EntitiesContext } from '../../../providers/entities.provider';
import { CanvasNode } from '../Canvas/canvas.models';

interface ItemAddNodeProps extends IDataTestID {
  mode: AddStepMode.PrependStep | AddStepMode.AppendStep;
}

export const ItemAddNode: FunctionComponent<ItemAddNodeProps> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const catalogModalContext = useContext(CatalogModalContext);
  const element: GraphElement<ElementModel, CanvasNode['data']> = useContext(ElementContext);

  const vizNode = element.getData()?.vizNode;
  const shouldRender = useMemo(() => {
    const nodeInteractions = vizNode?.getNodeInteraction() ?? { canHavePreviousStep: false, canHaveNextStep: false };

    return props.mode === AddStepMode.PrependStep
      ? nodeInteractions.canHavePreviousStep
      : nodeInteractions.canHaveNextStep;
  }, [props.mode, vizNode]);

  const onAddNode = useCallback(async () => {
    if (!vizNode || !entitiesContext) return;

    /** Get compatible nodes and the location where can be introduced */
    const compatibleNodes = entitiesContext.camelResource.getCompatibleComponents(props.mode, vizNode.data);

    /** Open Catalog modal, filtering the compatible nodes */
    const definedComponent = await catalogModalContext?.getNewComponent(compatibleNodes);
    if (!definedComponent) return;

    /** Add new node to the entities */
    vizNode.addBaseEntityStep(definedComponent, props.mode);

    /** Update entity */
    entitiesContext.updateEntitiesFromCamelResource();
  }, [catalogModalContext, entitiesContext, props.mode, vizNode]);

  return shouldRender ? (
    <ContextMenuItem onClick={onAddNode} data-testid={props['data-testid']}>
      {props.mode === AddStepMode.PrependStep ? (
        <>
          <AngleUpIcon /> Prepend
        </>
      ) : (
        <>
          <AngleDownIcon /> Append
        </>
      )}
    </ContextMenuItem>
  ) : null;
};
