import './TargetNodeActions.scss';

import { ActionListGroup } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';

import { MappingActionKind } from '../../../models/datamapper/mapping-action';
import { TargetNodeData } from '../../../models/datamapper/visualization';
import { MappingActionService } from '../../../services/visualization/mapping-action.service';
import { MappingActionRegistryService } from '../../../services/visualization/mapping-action-registry.service';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { DeleteMappingItemAction } from './DeleteMappingItemAction';
import { MappingContextMenuAction } from './MappingMenu/MappingContextMenuAction';
import { XPathEditorAction } from './XPathEditorAction';
import { XPathInputAction } from './XPathInputAction';

type TargetNodeActionsProps = {
  className?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
  onStructuralUpdate: () => void;
};

export const TargetNodeActions: FunctionComponent<TargetNodeActionsProps> = ({
  className,
  nodeData,
  onUpdate,
  onStructuralUpdate,
}) => {
  const expressionItem = VisualizationService.getExpressionItemForNode(nodeData);
  const isContextMenuAllowed = MappingActionRegistryService.isActionAllowed(nodeData, MappingActionKind.ContextMenu);
  const isDeleteAllowed = MappingActionRegistryService.isActionAllowed(nodeData, MappingActionKind.Delete);

  /**
   * Runs once the user finishes editing the XPath (input blur, Enter or editor modal close) rather
   * than on every keystroke: a change to an optional guard's see-through decision restructures the
   * tree, and rows change only at such commit points. When the commit absorbs the edited `if` row
   * into its field, the field's XPath input is asked to take focus after the rebuild if it sits on
   * the field's own row ({@link MappingActionService.restoreFocusAfterAbsorb}), unless the blur was
   * moving focus out of the edited row. Two side effects are left for user feedback: a mouse click
   * that caused the blur can miss its target when the rows below it shift during the rebuild, and a
   * container whose XPath is edited in a row of its own doesn't get focus back.
   */
  const handleXPathCommit = useCallback(
    (isFocusLeavingRow = false) => {
      if (!expressionItem) return;
      const result = MappingActionService.commitExpression(nodeData, expressionItem);
      if (result === 'update') {
        onUpdate();
      } else if (result === 'structural-update') {
        if (!isFocusLeavingRow) MappingActionService.restoreFocusAfterAbsorb(nodeData, expressionItem);
        onStructuralUpdate();
      }
    },
    [nodeData, expressionItem, onUpdate, onStructuralUpdate],
  );

  return (
    <ActionListGroup key={`target-node-actions-${nodeData.id}`} className={className}>
      {expressionItem && (
        <>
          <XPathInputAction
            nodeData={nodeData}
            mapping={expressionItem}
            onUpdate={onUpdate}
            onCommit={handleXPathCommit}
            renderIndex={nodeData.renderIndex}
          />
          <XPathEditorAction
            nodeData={nodeData}
            mapping={expressionItem}
            onUpdate={onUpdate}
            onCommit={handleXPathCommit}
          />
        </>
      )}
      {isContextMenuAllowed && <MappingContextMenuAction nodeData={nodeData} onUpdate={onStructuralUpdate} />}
      {isDeleteAllowed && <DeleteMappingItemAction nodeData={nodeData} onDelete={onStructuralUpdate} />}
    </ActionListGroup>
  );
};
