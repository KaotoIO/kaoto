import { ArrowDownIcon, ArrowUpIcon, CodeBranchIcon, CopyIcon, PasteIcon, PlusIcon } from '@patternfly/react-icons';
import { ContextMenuSeparator, ElementModel, GraphElement } from '@patternfly/react-topology';
import { forwardRef, ReactElement } from 'react';
import { AddStepMode, IVisualizationNode, NodeInteraction } from '../../../../models/visualization/base-visual-entity';
import { CanvasNode } from '../../Canvas/canvas.models';
import { ItemAddStep } from './ItemAddStep';
import { ItemDeleteGroup } from './ItemDeleteGroup';
import { ItemDeleteStep } from './ItemDeleteStep';
import { ItemDisableStep } from './ItemDisableStep';
import { ItemEnableAllSteps } from './ItemEnableAllSteps';
import { ItemInsertStep } from './ItemInsertStep';
import { ItemReplaceStep } from './ItemReplaceStep';
import { ItemCopyStep } from './ItemCopyStep';
import { ItemPasteStep } from './ItemPasteStep';

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

  addCopyPasteItems(items, nodeInteractions, vizNode);

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
  items.push(<ItemEnableAllSteps key="context-menu-item-enable-all" data-testid="context-menu-item-enable-all" />);

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
      <ItemDeleteStep key="context-menu-item-delete" data-testid="context-menu-item-delete" vizNode={vizNode} />,
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

const addCopyPasteItems = (items: ReactElement[], nodeInteractions: NodeInteraction, vizNode: IVisualizationNode) => {
  items.push(
    <ItemCopyStep key="context-menu-item-copy" data-testid="context-menu-item-copy" vizNode={vizNode}>
      <CopyIcon /> Copy
    </ItemCopyStep>,
  );

  if (nodeInteractions.canHaveChildren) {
    items.push(
      <ItemPasteStep
        key="context-menu-item-paste-as-child"
        data-testid="context-menu-item-paste-as-child"
        mode={AddStepMode.InsertChildStep}
        vizNode={vizNode}
      >
        <PasteIcon /> Paste as child
      </ItemPasteStep>,
    );
  }

  if (nodeInteractions.canHaveNextStep) {
    items.push(
      <ItemPasteStep
        key="context-menu-item-paste-as-next-step"
        data-testid="context-menu-item-paste-as-next-step"
        mode={AddStepMode.AppendStep}
        vizNode={vizNode}
      >
        <PasteIcon /> Paste as next step
      </ItemPasteStep>,
    );
  }

  if (nodeInteractions.canHaveSpecialChildren) {
    items.push(
      <ItemPasteStep
        key="context-menu-item-paste-as-special-child"
        data-testid="context-menu-item-paste-as-special-child"
        mode={AddStepMode.InsertSpecialChildStep}
        vizNode={vizNode}
      >
        <PasteIcon /> Paste as special child
      </ItemPasteStep>,
    );
  }
};
