import { ArrowDownIcon, ArrowUpIcon, CodeBranchIcon, PlusIcon } from '@patternfly/react-icons';
import { ContextMenuSeparator, ElementModel, GraphElement } from '@patternfly/react-topology';
import { forwardRef, ReactElement } from 'react';
import { AddStepMode } from '../../../../models/visualization/base-visual-entity';
import { CanvasNode } from '../../Canvas/canvas.models';
import { ItemAddStep } from './ItemAddStep';
import { ItemDeleteGroup } from './ItemDeleteGroup';
import { ItemDeleteStep } from './ItemDeleteStep';
import { ItemDisableStep } from './ItemDisableStep';
import { ItemInsertStep } from './ItemInsertStep';
import { ItemReplaceStep } from './ItemReplaceStep';

export const NodeContextMenuFn = (element: GraphElement<ElementModel, CanvasNode['data']>) => {
  const items: ReactElement[] = [];
  const vizNode = element.getData()?.vizNode;
  if (!vizNode) return items;

  const nodeInteractions = vizNode.getNodeInteraction();
  const childrenNodes = vizNode.getChildren();
  const isStepWithChildren = childrenNodes !== undefined && childrenNodes.length > 0;

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
      <ItemReplaceStep
        key="context-menu-item-replace"
        data-testid="context-menu-item-replace"
        vizNode={vizNode}
        loadActionConfirmationModal={isStepWithChildren}
      />,
    );
  }
  if (nodeInteractions.canBeDisabled || nodeInteractions.canReplaceStep) {
    items.push(<ContextMenuSeparator key="context-menu-separator-replace" />);
  }

  if (nodeInteractions.canRemoveStep) {
    items.push(
      <ItemDeleteStep
        key="context-menu-item-delete"
        data-testid="context-menu-item-delete"
        vizNode={vizNode}
        loadActionConfirmationModal={isStepWithChildren}
      />,
    );
  }
  if (nodeInteractions.canRemoveFlow) {
    items.push(
      <ItemDeleteGroup
        key="context-menu-container-remove"
        data-testid="context-menu-item-container-remove"
        vizNode={vizNode}
      />,
    );
  }

  return items;
};

export const NodeContextMenu = forwardRef<HTMLDivElement, { element: GraphElement<ElementModel, CanvasNode['data']> }>(
  ({ element }, forwardedRef) => {
    return (
      <div data-testid="node-context-menu" ref={forwardedRef}>
        {NodeContextMenuFn(element)}
      </div>
    );
  },
);
