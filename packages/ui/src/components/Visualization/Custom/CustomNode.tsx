import { Tooltip } from '@patternfly/react-core';
import { ArrowDownIcon, ArrowUpIcon, BanIcon, CodeBranchIcon, PlusIcon } from '@patternfly/react-icons';
import {
  ContextMenuSeparator,
  Decorator,
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
import clsx from 'clsx';
import { FunctionComponent, ReactElement } from 'react';
import { AddStepMode } from '../../../models/visualization/base-visual-entity';
import { CanvasDefaults } from '../Canvas/canvas.defaults';
import { CanvasNode } from '../Canvas/canvas.models';
import './CustomNode.scss';
import { ItemAddStep } from './ItemAddStep';
import { ItemDeleteGroup } from './ItemDeleteGroup';
import { ItemDeleteStep } from './ItemDeleteStep';
import { ItemDisableStep } from './ItemDisableStep';
import { ItemInsertStep } from './ItemInsertStep';
import { ItemReplaceStep } from './ItemReplaceStep';

interface CustomNodeProps extends WithSelectionProps {
  element: Node<CanvasNode, CanvasNode['data']>;
}
const noopFn = () => {};

const CustomNode: FunctionComponent<CustomNodeProps> = observer(({ element, ...rest }) => {
  const vizNode = element.getData()?.vizNode;
  const label = vizNode?.getNodeLabel();
  const isDisabled = !!vizNode?.getComponentSchema()?.definition?.disabled;
  const tooltipContent = vizNode?.getTooltipContent();
  const statusDecoratorTooltip = vizNode?.getNodeValidationText();
  const nodeStatus = !statusDecoratorTooltip || isDisabled ? NodeStatus.default : NodeStatus.warning;

  return (
    <DefaultNode
      {...rest}
      element={element}
      label={label}
      labelClassName={clsx('custom-node__label', { 'custom-node__label--disabled': isDisabled })}
      truncateLength={15}
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

    if (nodeInteractions.canBeDisabled) {
      items.push(
        <ItemDisableStep key="context-menu-item-disable" data-testid="context-menu-item-disable" vizNode={vizNode} />,
      );
    }
    if (nodeInteractions.canReplaceStep) {
      items.push(
        <ItemReplaceStep key="context-menu-item-replace" data-testid="context-menu-item-replace" vizNode={vizNode} />,
      );
    }
    if (nodeInteractions.canBeDisabled || nodeInteractions.canReplaceStep) {
      items.push(<ContextMenuSeparator key="context-menu-separator-replace" />);
    }

    if (nodeInteractions.canRemoveStep) {
      const childrenNodes = vizNode.getChildren();
      const shouldConfirmBeforeDeletion = childrenNodes !== undefined && childrenNodes.length > 0;
      items.push(
        <ItemDeleteStep
          key="context-menu-item-delete"
          data-testid="context-menu-item-delete"
          vizNode={vizNode}
          loadModal={shouldConfirmBeforeDeletion}
        />,
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
