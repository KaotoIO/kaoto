import { Tooltip } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
import {
  Decorator,
  DefaultNode,
  Node,
  NodeStatus,
  ScaleDetailsLevel,
  WithSelectionProps,
  observer,
  useSelection,
  withContextMenu,
  withSelection,
} from '@patternfly/react-topology';
import clsx from 'clsx';
import { FunctionComponent, useContext } from 'react';
import { SettingsContext } from '../../../../providers';
import { doTruncateLabel } from '../../../../utils/truncate-label';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasNode } from '../../Canvas/canvas.models';
import './CustomNode.scss';
import { NodeContextMenuFn } from '../ContextMenu/NodeContextMenu';

interface CustomNodeProps extends WithSelectionProps {
  element: Node<CanvasNode, CanvasNode['data']>;
}
const noopFn = () => {};

const CustomNode: FunctionComponent<CustomNodeProps> = observer(({ element, ...rest }) => {
  const vizNode = element.getData()?.vizNode;
  const settingsAdapter = useContext(SettingsContext);
  const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
  const isDisabled = !!vizNode?.getComponentSchema()?.definition?.disabled;
  const tooltipContent = vizNode?.getTooltipContent();
  const statusDecoratorTooltip = vizNode?.getNodeValidationText();
  const nodeStatus = !statusDecoratorTooltip || isDisabled ? NodeStatus.default : NodeStatus.warning;
  const detailsLevel = element.getGraph().getDetailsLevel();
  const [selected] = useSelection();

  return (
    <DefaultNode
      {...rest}
      element={element}
      label={selected ? label : doTruncateLabel(label)}
      scaleLabel={detailsLevel !== ScaleDetailsLevel.low}
      labelClassName={clsx('custom-node__label', {
        'custom-node__label--disabled': isDisabled,
        'custom-node__label--selected': selected,
      })}
      showStatusDecorator={!isDisabled}
      statusDecoratorTooltip={statusDecoratorTooltip}
      nodeStatus={nodeStatus}
      onStatusDecoratorClick={noopFn}
    >
      <g
        className="custom-node"
        data-testid={`custom-node__${vizNode?.id}`}
        data-nodelabel={label}
        data-disabled={isDisabled}
      >
        <foreignObject
          x="0"
          y="0"
          width={CanvasDefaults.DEFAULT_NODE_DIAMETER}
          height={CanvasDefaults.DEFAULT_NODE_DIAMETER}
        >
          <Tooltip content={tooltipContent}>
            <div className="custom-node__image">
              <img src={vizNode?.data.icon} />
            </div>
          </Tooltip>
        </foreignObject>

        {isDisabled && (
          <Decorator
            radius={12}
            x={CanvasDefaults.DEFAULT_NODE_DIAMETER}
            y={0}
            icon={<BanIcon className="custom-node--disabled" />}
            showBackground
          />
        )}
      </g>
    </DefaultNode>
  );
});

export const CustomNodeWithSelection: typeof DefaultNode = withSelection()(
  withContextMenu(NodeContextMenuFn)(CustomNode as typeof DefaultNode),
) as typeof DefaultNode;
