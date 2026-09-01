import './TargetNodeActions.scss';

import { ActionListGroup } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import { MappingActionKind } from '../../../models/datamapper/mapping-action';
import { TargetNodeData } from '../../../models/datamapper/visualization';
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
  const allowedActions = new Set(MappingActionRegistryService.getAllowedActions(nodeData));

  return (
    <ActionListGroup key={`target-node-actions-${nodeData.id}`} className={className}>
      {expressionItem && (
        <>
          <XPathInputAction nodeData={nodeData} mapping={expressionItem} onUpdate={onUpdate} />
          <XPathEditorAction nodeData={nodeData} mapping={expressionItem} onUpdate={onUpdate} />
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
