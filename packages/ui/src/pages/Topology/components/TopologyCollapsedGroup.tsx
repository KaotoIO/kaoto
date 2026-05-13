import { DefaultGroup, ElementModel, GraphElement, isNode, observer } from '@patternfly/react-topology';
import { FunctionComponent, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

import { CanvasDefaults } from '../../../components/Visualization/Canvas/canvas.defaults';
import { CanvasNode } from '../../../components/Visualization/Canvas/canvas.models';
import { CustomNodeContainer } from '../../../components/Visualization/Custom/Node/CustomNodeContainer';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntityData } from '../../../models/visualization/flows/support/camel-component-types';
import { VisibleFlowsContext } from '../../../providers/visible-flows.provider';
import { Links } from '../../../router/links.models';
import { getProcessorIcon } from '../../../utils/processor-icon';
import { TopologyNodeLabel } from './TopologyNodeLabel';

type IDefaultGroup = Parameters<typeof DefaultGroup>[0];

interface TopologyCollapsedGroupProps extends IDefaultGroup {
  element: GraphElement<ElementModel, CanvasNode['data']>;
}

/**
 * Renders a route as a single collapsed-group node. Reacts to:
 *  - double-click → hide every other flow and navigate to the Design view
 *  - right-click → show the topology context menu (Open)
 */
export const TopologyCollapsedGroup: FunctionComponent<TopologyCollapsedGroupProps> = observer(
  ({ element, onContextMenu }) => {
    if (!isNode(element)) {
      throw new Error('TopologyCollapsedGroup must be used only on Node elements');
    }

    const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
    const visibleFlowsContext = useContext(VisibleFlowsContext);
    const navigate = useNavigate();

    const handleDoubleClick = useCallback(() => {
      const routeId = vizNode?.getId();
      if (!routeId || !visibleFlowsContext) {
        return;
      }
      visibleFlowsContext.visualFlowsApi.hideFlows();
      visibleFlowsContext.visualFlowsApi.showFlows([routeId]);
      navigate(Links.Home);
    }, [navigate, visibleFlowsContext, vizNode]);

    if (!vizNode) {
      return null;
    }

    const processorName = (vizNode.data as CamelRouteVisualEntityData).processorName;
    const ProcessorIcon = getProcessorIcon(processorName);
    const processorDescription = vizNode.data.processorIconTooltip ?? '';
    const definition = vizNode.getNodeDefinition() as { disabled?: boolean; description?: string } | undefined;
    const isDisabled = !!definition?.disabled;
    // Prefer the user-supplied route description as the visible label; otherwise fall back
    // to the regular node label (typically the route id).
    const label = definition?.description?.trim() || vizNode.getNodeLabel();
    const childCount = element.getAllNodeChildren?.()?.length ?? 0;
    const bounds = element.getBounds?.();
    const width = bounds?.width ?? CanvasDefaults.DEFAULT_NODE_WIDTH;
    const height = bounds?.height ?? CanvasDefaults.DEFAULT_NODE_HEIGHT;

    return (
      <g
        className="custom-node topology-collapsed-route"
        data-testid={`topology-route__${vizNode.id}`}
        data-nodelabel={label}
        data-disabled={isDisabled}
        onDoubleClick={handleDoubleClick}
        onContextMenu={onContextMenu}
      >
        <CustomNodeContainer
          width={width}
          height={height}
          dataNodelabel={label}
          dataTestId={vizNode.id}
          containerClassNames={{ 'custom-node__container': true }}
          vizNode={vizNode}
          childCount={childCount}
          ProcessorIcon={ProcessorIcon}
          processorDescription={processorDescription}
          isDisabled={isDisabled}
        />
        <TopologyNodeLabel label={label} nodeWidth={width} nodeHeight={height} />
      </g>
    );
  },
);
