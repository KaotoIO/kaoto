import {
  DefaultNode,
  Node,
  NodeStatus,
  observer,
  withContextMenu,
  withSelection,
  WithSelectionProps,
} from '@patternfly/react-topology';
import { Tooltip } from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CanvasDefaults } from '../Canvas/canvas.defaults';
import { CanvasNode } from '../Canvas/canvas.models';
import './CustomNode.scss';
import { ItemAddNode } from './ItemAddNode';
import { ItemInsertChildNode } from './ItemInsertChildNode';
import { ItemRemoveNode } from './ItemRemoveNode';
import { ItemReplaceNode } from './ItemReplaceNode';

interface CustomNodeProps extends WithSelectionProps {
  element: Node<CanvasNode, CanvasNode['data']>;
}
const noopFn = () => {};

const CustomNode: FunctionComponent<CustomNodeProps> = observer(({ element, ...rest }) => {
  const vizNode = element.getData()?.vizNode;
  const label = vizNode?.getNodeLabel();
  const tooltipContent = vizNode?.getTooltipContent();
  const statusDecoratorTooltip = vizNode?.getNodeValidationText();
  const nodeStatus = !statusDecoratorTooltip ? NodeStatus.default : NodeStatus.warning;

  let nType: string = '';
  let badge = undefined;
  let badgeColor = undefined;
  let badgeTextColor = undefined;
  const badgeBorderColor = 'black';

  if (vizNode && vizNode.data['componentName']) {
    nType = '' + vizNode.data['componentName'];
  }

  if (nType === '') {
    badge = 'P';
    badgeColor = '#F4C145';
    badgeTextColor = 'black';
  } else if (nType.startsWith('kamelet:')) {
    badge = 'K';
    badgeColor = '#0066CC';
    badgeTextColor = 'white';
  } else {
    badge = 'C';
    badgeColor = '#6EC664';
    badgeTextColor = 'black';
  }

  return (
    <DefaultNode
      {...rest}
      element={element}
      label={label}
      badge={badge}
      badgeColor={badgeColor}
      badgeTextColor={badgeTextColor}
      badgeBorderColor={badgeBorderColor}
      truncateLength={15}
      showStatusDecorator
      statusDecoratorTooltip={statusDecoratorTooltip}
      nodeStatus={nodeStatus}
      onStatusDecoratorClick={noopFn}
    >
      <g data-testid={`custom-node__${vizNode?.id}`} data-nodelabel={label}>
        <foreignObject
          x="0"
          y="0"
          width={CanvasDefaults.DEFAULT_NODE_DIAMETER}
          height={CanvasDefaults.DEFAULT_NODE_DIAMETER}
        >
          <Tooltip content={tooltipContent}>
            <div className="custom-node__image">
              <img
                src={vizNode?.data.icon}
                width={CanvasDefaults.DEFAULT_NODE_DIAMETER * 0.7}
                height={CanvasDefaults.DEFAULT_NODE_DIAMETER * 0.7}
              />
            </div>
          </Tooltip>
        </foreignObject>
      </g>
    </DefaultNode>
  );
});

export const CustomNodeWithSelection: typeof DefaultNode = withContextMenu(() => [
  <ItemAddNode
    key="context-menu-item-prepend"
    data-testid="context-menu-item-prepend"
    mode={AddStepMode.PrependStep}
  />,
  <ItemAddNode key="context-menu-item-append" data-testid="context-menu-item-append" mode={AddStepMode.AppendStep} />,
  <ItemInsertChildNode
    key="context-menu-item-insert"
    data-testid="context-menu-item-insert"
    mode={AddStepMode.InsertChildStep}
  />,
  <ItemInsertChildNode
    key="context-menu-item-insert-special"
    data-testid="context-menu-item-insert-special"
    mode={AddStepMode.InsertSpecialChildStep}
  />,
  <ItemReplaceNode key="context-menu-item-replace" data-testid="context-menu-item-replace" />,
  <ItemRemoveNode key="context-menu-item-remove" data-testid="context-menu-item-remove" />,
])(withSelection()(CustomNode) as typeof DefaultNode) as typeof DefaultNode;
