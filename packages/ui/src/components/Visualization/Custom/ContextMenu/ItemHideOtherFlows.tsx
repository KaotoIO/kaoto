import { EyeSlashIcon } from '@patternfly/react-icons';
import { ContextMenuItem } from '@patternfly/react-topology';
import { FunctionComponent, useContext } from 'react';

import { IDataTestID } from '../../../../models';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { VisibleFlowsContext } from '../../../../providers';

interface ItemHideOtherFlowsProps extends IDataTestID {
  vizNode: IVisualizationNode;
}

export const ItemHideOtherFlows: FunctionComponent<ItemHideOtherFlowsProps> = (props) => {
  const visibleFlowsContext = useContext(VisibleFlowsContext);
  const flowId = props.vizNode.getId();

  const onClick = () => {
    if (!flowId || !visibleFlowsContext?.visualFlowsApi) return;

    const allFlowIds = Object.keys(visibleFlowsContext.visibleFlows);
    const otherFlowIds = allFlowIds.filter((id) => id !== flowId);

    visibleFlowsContext.visualFlowsApi.hideFlows(otherFlowIds);
    visibleFlowsContext.visualFlowsApi.showFlows([flowId]);
  };

  return (
    <ContextMenuItem onClick={onClick} data-testid={props['data-testid']}>
      <EyeSlashIcon /> Hide rest
    </ContextMenuItem>
  );
};
