import { TrashIcon } from '@patternfly/react-icons';
import { ContextMenuItem, ElementContext, ElementModel, GraphElement } from '@patternfly/react-topology';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { IDataTestID } from '../../../models';
import { EntitiesContext } from '../../../providers/entities.provider';
import { CanvasNode } from '../Canvas/canvas.models';

export const ItemRemoveGroup: FunctionComponent<IDataTestID> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const element: GraphElement<ElementModel, CanvasNode['data']> = useContext(ElementContext);
  const vizNode = element.getData()?.vizNode;
  const flowId = vizNode?.getBaseEntity()?.getId();
  const shouldRender = useMemo(() => {
    const nodeInteractions = vizNode?.getNodeInteraction() ?? { canRemoveFlow: false };

    return nodeInteractions.canRemoveFlow;
  }, [vizNode]);

  const onRemoveGroup = useCallback(() => {
    entitiesContext?.camelResource.removeEntity(flowId);
    entitiesContext?.updateEntitiesFromCamelResource();
  }, [entitiesContext, flowId]);

  return shouldRender ? (
    <ContextMenuItem onClick={onRemoveGroup} data-testid={props['data-testid']}>
      <TrashIcon /> Delete
    </ContextMenuItem>
  ) : null;
};
