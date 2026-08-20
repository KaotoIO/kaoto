import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { AnchorEnd, ElementModel, GraphElement, isNode, observer, useAnchor } from '@patternfly/react-topology';
import { FunctionComponent, useCallback } from 'react';

import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { getProcessorIcon } from '../../../../utils/processor-icon';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode } from '../../Canvas/canvas.models';
import { useNodeValidationText } from '../hooks/use-node-validation-text.hook';
import { TopologySourceAnchor, TopologyTargetAnchor } from '../topology-anchor';
import { CustomNodeContainer } from './CustomNodeContainer';
import { CustomNodeLabel } from './CustomNodeLabel';

interface TopologyRouteNodeProps {
  element: GraphElement<ElementModel, CanvasNode['data']>;
}

export const TopologyNode: FunctionComponent<TopologyRouteNodeProps> = observer(({ element }) => {
  if (!isNode(element)) {
    throw new Error('TopologyRouteNode must be used only on Node elements');
  }

  useAnchor(
    useCallback((node) => new TopologySourceAnchor(node), []),
    AnchorEnd.both,
  );
  useAnchor(
    useCallback((node) => new TopologyTargetAnchor(node), []),
    AnchorEnd.target,
  );

  const vizNode: IVisualizationNode | undefined = element.getData()?.vizNode;
  const validationText = useNodeValidationText(vizNode);
  if (!vizNode) {
    return null;
  }

  const processorName = vizNode.data.primaryNodeId?.name;
  const ProcessorIcon = getProcessorIcon(processorName as keyof ProcessorDefinition);
  const processorDescription = vizNode.data.processorIconTooltip ?? '';
  const definition = vizNode.getNodeDefinition() as { disabled?: boolean; description?: string } | undefined;
  const label = definition?.description?.trim() || vizNode.getNodeLabel();
  const bounds = element.getBounds();
  const width = bounds.width;
  const isDisabled = !!vizNode?.getNodeDefinition()?.disabled;
  const doesHaveWarnings = !isDisabled && !!validationText;
  const labelX = (width - CanvasDefaults.DEFAULT_LABEL_WIDTH) / 2;

  return (
    <g
      className="custom-node topology-route-node"
      data-testid={`topology__${vizNode.id}`}
      data-nodelabel={label}
      data-disabled={isDisabled}
    >
      <CustomNodeContainer
        width={bounds.width}
        height={bounds.height}
        dataNodelabel={label}
        dataTestId={vizNode.id}
        vizNode={vizNode}
        isCollapsed={element.isCollapsed()}
        childCount={0}
        ProcessorIcon={ProcessorIcon}
        processorDescription={processorDescription}
        isDisabled={isDisabled}
      />
      <CustomNodeLabel
        label={label}
        doesHaveWarnings={doesHaveWarnings}
        validationText={validationText}
        x={labelX}
        y={bounds.height - 1}
      />
    </g>
  );
});
