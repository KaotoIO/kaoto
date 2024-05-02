import { Tooltip } from '@patternfly/react-core';
import { ArrowDownIcon, ArrowUpIcon, CodeBranchIcon, PlusIcon } from '@patternfly/react-icons';
import {
  ContextMenuSeparator,
  DefaultNode,
  ElementModel,
  GraphElement,
  Node,
  NodeStatus,
  WithSelectionProps,
  observer,
  withContextMenu,
  withSelection,
} from '@patternfly/react-topology';
import { FunctionComponent, ReactElement } from 'react';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CanvasDefaults } from '../Canvas/canvas.defaults';
import { CanvasNode } from '../Canvas/canvas.models';
import './CustomNode.scss';
import { ItemAddStep } from './ItemAddStep';
import { ItemDeleteGroup } from './ItemDeleteGroup';
import { ItemDeleteStep } from './ItemDeleteStep';
import { ItemInsertStep } from './ItemInsertStep';
import { ItemReplaceStep } from './ItemReplaceStep';

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

  return (
    <DefaultNode
      {...rest}
      element={element}
      label={label}
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
              <img src={vizNode?.data.icon} />
            </div>
          </Tooltip>
        </foreignObject>
      </g>
    </DefaultNode>
  );
});

export const CustomNodeWithSelection: typeof DefaultNode = withSelection()(
  withContextMenu((element: GraphElement<ElementModel, CanvasNode['data']>) => {
    const items: ReactElement[] = [];
    const vizNode = element.getData()?.vizNode;
    if (!vizNode) return items;

    const nodeInteractions = vizNode.getNodeInteraction();

    if (nodeInteractions.canHavePreviousStep) {
      items.push(
        <ItemAddStep
          key="context-menu-item-prepend"
          data-testid="context-menu-item-prepend"
          mode={AddStepMode.PrependStep}
          vizNode={vizNode}
        >
          <ArrowUpIcon /> Prepend
        </ItemAddStep>,
      );
    }
    if (nodeInteractions.canHaveNextStep) {
      items.push(
        <ItemAddStep
          key="context-menu-item-append"
          data-testid="context-menu-item-append"
          mode={AddStepMode.AppendStep}
          vizNode={vizNode}
        >
          <ArrowDownIcon /> Append
        </ItemAddStep>,
      );
    }
    if (nodeInteractions.canHavePreviousStep || nodeInteractions.canHaveNextStep) {
      items.push(<ContextMenuSeparator key="context-menu-separator-add" />);
    }

    if (nodeInteractions.canHaveChildren) {
      items.push(
        <ItemInsertStep
          key="context-menu-item-insert"
          data-testid="context-menu-item-insert"
          mode={AddStepMode.InsertChildStep}
          vizNode={vizNode}
        >
          <PlusIcon /> Add step
        </ItemInsertStep>,
      );
    }
    if (nodeInteractions.canHaveSpecialChildren) {
      items.push(
        <ItemInsertStep
          key="context-menu-item-insert-special"
          data-testid="context-menu-item-insert-special"
          mode={AddStepMode.InsertSpecialChildStep}
          vizNode={vizNode}
        >
          <CodeBranchIcon /> Add branch
        </ItemInsertStep>,
      );
    }
    if (nodeInteractions.canHaveChildren || nodeInteractions.canHaveSpecialChildren) {
      items.push(<ContextMenuSeparator key="context-menu-separator-insert" />);
    }

    if (nodeInteractions.canReplaceStep) {
      items.push(
        <ItemReplaceStep key="context-menu-item-replace" data-testid="context-menu-item-replace" vizNode={vizNode} />,
      );
      items.push(<ContextMenuSeparator key="context-menu-separator" />);
    }

    if (nodeInteractions.canRemoveStep) {
      items.push(
        <ItemDeleteStep key="context-menu-item-delete" data-testid="context-menu-item-delete" vizNode={vizNode} />,
      );
    }
    if (nodeInteractions.canRemoveFlow) {
      items.push(
        <ItemDeleteGroup
          key="context-menu-container-remove"
          data-testid="context-menu-container-remove"
          vizNode={vizNode}
        />,
      );
    }

    return items;
  })(CustomNode as typeof DefaultNode),
) as typeof DefaultNode;
