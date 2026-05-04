import { EdgeTerminalType, GraphElement, isEdge, TaskEdge } from '@patternfly/react-topology';
import { observer } from 'mobx-react';
import { FunctionComponent } from 'react';

/** Spacing for TaskEdge integral bends — aligned with Dagre nodesep/ranksep in topology layout. */
const TOPOLOGY_EDGE_NODE_SEPARATION = 20;

interface TopologyEdgeProps {
  element: GraphElement;
}

const TopologyEdge: FunctionComponent<TopologyEdgeProps> = ({ element, ...props }) => {
  if (!isEdge(element)) {
    throw new Error('TopologyEdge must be used only on Edge elements');
  }

  return (
    <TaskEdge
      element={element}
      endTerminalType={EdgeTerminalType.directional}
      nodeSeparation={TOPOLOGY_EDGE_NODE_SEPARATION}
      {...props}
    />
  );
};

export default observer(TopologyEdge);
