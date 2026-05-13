import { ArrowRightIcon } from '@patternfly/react-icons';
import { ContextMenuItem, ElementModel, GraphElement } from '@patternfly/react-topology';
import { FunctionComponent, ReactElement, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { CanvasNode } from '../../components/Visualization/Canvas/canvas.models';
import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { VisibleFlowsContext } from '../../providers/visible-flows.provider';
import { Links } from '../../router/links.models';

interface OpenInDesignItemProps {
  vizNode: IVisualizationNode;
}

const OpenInDesignItem: FunctionComponent<OpenInDesignItemProps> = ({ vizNode }) => {
  const visibleFlowsContext = useContext(VisibleFlowsContext);
  const navigate = useNavigate();

  const onClick = useCallback(() => {
    const routeId = vizNode.getId();
    if (!routeId || !visibleFlowsContext) {
      return;
    }
    visibleFlowsContext.visualFlowsApi.hideFlows();
    visibleFlowsContext.visualFlowsApi.showFlows([routeId]);
    navigate(Links.Home);
  }, [navigate, visibleFlowsContext, vizNode]);

  return (
    <ContextMenuItem onClick={onClick} data-testid="topology-context-menu-open">
      <ArrowRightIcon /> Open
    </ContextMenuItem>
  );
};

export const topologyContextMenuFn = (element: GraphElement<ElementModel, CanvasNode['data']>): ReactElement[] => {
  const vizNode = element.getData()?.vizNode;
  if (!vizNode) {
    return [];
  }
  return [<OpenInDesignItem key="topology-context-menu-open" vizNode={vizNode} />];
};
