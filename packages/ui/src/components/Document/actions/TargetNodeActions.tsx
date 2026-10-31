import './TargetNodeActions.scss';

import { ActionListGroup } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
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
  const { sourceParameterMap, sourceBodyDocument } = useDataMapper();
  const expressionItem = VisualizationService.getExpressionItemForNode(nodeData);
  const allowedActions = new Set(
    MappingActionRegistryService.getAllowedActions(nodeData, {
      sourceParameterMap,
      sourceBody: sourceBodyDocument,
    }),
  );

  /**
   * Runs once the user finishes editing the XPath (input blur or editor modal close) rather than
   * on every keystroke: a change to an optional guard's see-through decision restructures the
   * tree, and rows change only at such commit points.
   */
  const handleXPathCommit = useCallback(() => {
    if (!expressionItem) return;
    const result = MappingActionService.commitExpression(nodeData, expressionItem);
    if (result === 'update') onUpdate();
    else if (result === 'structural-update') onStructuralUpdate();
  }, [nodeData, expressionItem, onUpdate, onStructuralUpdate]);

  return (
    <ActionListGroup key={`target-node-actions-${nodeData.id}`} className={className}>
      {expressionItem && (
        <>
          <XPathInputAction
            nodeData={nodeData}
            mapping={expressionItem}
            onUpdate={onUpdate}
            onCommit={handleXPathCommit}
          />
          <XPathEditorAction
            nodeData={nodeData}
            mapping={expressionItem}
            onUpdate={onUpdate}
            onCommit={handleXPathCommit}
          />
        </>
      )}
      {allowedActions.has(MappingActionKind.ContextMenu) && (
        <MappingContextMenuAction nodeData={nodeData} onUpdate={onStructuralUpdate} />
      )}
      {allowedActions.has(MappingActionKind.Delete) && (
        <DeleteMappingItemAction nodeData={nodeData} onDelete={onStructuralUpdate} />
      )}
    </ActionListGroup>
  );
};
