import './TargetPanel.scss';

import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { flattenTreeNodes } from '../../utils/flatten-tree-nodes';
import { updateVisiblePortPositions } from '../../utils/update-visible-port-positions';
import { VirtuosoWithVisibility } from '../DataMapper/VirtuosoWithVisibility';
import { ConditionMenuAction } from '../Document/actions/ConditionMenuAction';
import { DeleteMappingItemAction } from '../Document/actions/DeleteMappingItemAction';
import { XPathEditorAction } from '../Document/actions/XPathEditorAction';
import { XPathInputAction } from '../Document/actions/XPathInputAction';
import { DocumentHeader } from '../Document/BaseDocument';
import { TargetDocumentNode } from '../Document/TargetDocumentNode';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
import { ExpansionPanels } from '../ExpansionPanels/ExpansionPanels';
import {
  TARGET_PANEL_DEFAULT_HEIGHT,
  TARGET_PANEL_MIN_HEIGHT,
  VIRTUOSO_OVERSCAN,
} from '../ExpansionPanels/panel-dimensions';

export const TargetPanel: FunctionComponent = () => {
  const { targetBodyDocument, mappingTree, refreshMappingTree } = useDataMapper();

  // Create tree for target body
  const targetBodyNodeData = useMemo(
    () => new TargetDocumentNodeData(targetBodyDocument, mappingTree),
    [targetBodyDocument, mappingTree],
  );
  const [targetBodyTree, setTargetBodyTree] = useState<DocumentTree | undefined>(undefined);

  useEffect(() => {
    setTargetBodyTree(TreeUIService.createTree(targetBodyNodeData));
  }, [targetBodyNodeData]);

  // Optimize: Select only the expansion state for this document
  const documentExpansionState = useDocumentTreeStore((state) => state.expansionState);

  // Flatten tree based on expansion state
  const flattenedNodes = useMemo(() => {
    if (!targetBodyTree) return [];
    return flattenTreeNodes(targetBodyTree.root, (path) => documentExpansionState[path] ?? false);
  }, [targetBodyTree, documentExpansionState]);

  const handleUpdate = useCallback(() => {
    refreshMappingTree();
  }, [refreshMappingTree]);

  // Get expression item for primitive target body (if it has a mapping)
  const expressionItem = useMemo(() => {
    if (!targetBodyNodeData.isPrimitive) return null;
    return VisualizationService.getExpressionItemForNode(targetBodyNodeData);
  }, [targetBodyNodeData]);

  // Actions for target body document
  const documentActions = useMemo(() => {
    const actions = [];

    // XPath actions for primitive target body with mapping
    if (expressionItem) {
      actions.push(
        <XPathInputAction key="xpath-input" mapping={expressionItem} onUpdate={handleUpdate} />,
        <XPathEditorAction
          key="xpath-editor"
          nodeData={targetBodyNodeData}
          mapping={expressionItem}
          onUpdate={handleUpdate}
        />,
      );
    }

    // Condition menu (kebab menu) before delete
    if (VisualizationService.allowConditionMenu(targetBodyNodeData)) {
      actions.push(<ConditionMenuAction key="condition-menu" nodeData={targetBodyNodeData} onUpdate={handleUpdate} />);
    }

    // Delete action comes last (bin icon at the end)
    if (expressionItem && VisualizationService.isDeletableNode(targetBodyNodeData)) {
      actions.push(
        <DeleteMappingItemAction key="delete-mapping" nodeData={targetBodyNodeData} onDelete={handleUpdate} />,
      );
    }

    return actions;
  }, [expressionItem, targetBodyNodeData, handleUpdate]);

  const hasSchema = !targetBodyNodeData.isPrimitive;

  return (
    <div id="panel-target" className="target-panel">
      <ExpansionPanels lastPanelId="target-body">
        <ExpansionPanel
          id="target-body"
          defaultExpanded={true}
          defaultHeight={TARGET_PANEL_DEFAULT_HEIGHT}
          minHeight={TARGET_PANEL_MIN_HEIGHT}
          collapsible={false}
          summary={
            <DocumentHeader
              header={<span className="panel-header-text">Body</span>}
              document={targetBodyDocument}
              documentType={DocumentType.TARGET_BODY}
              isReadOnly={false}
              additionalActions={documentActions}
              enableDnD={true}
              nodeData={targetBodyNodeData}
            />
          }
          onLayoutChange={updateVisiblePortPositions}
        >
          {hasSchema && targetBodyTree && (
            <VirtuosoWithVisibility
              totalCount={flattenedNodes.length}
              itemContent={(index) => {
                const flattenedNode = flattenedNodes[index];
                return (
                  <TargetDocumentNode
                    key={flattenedNode.path}
                    treeNode={flattenedNode.treeNode}
                    documentId={targetBodyNodeData.id}
                    rank={flattenedNode.depth + 1}
                  />
                );
              }}
              overscan={VIRTUOSO_OVERSCAN}
            />
          )}
        </ExpansionPanel>
      </ExpansionPanels>
    </div>
  );
};
