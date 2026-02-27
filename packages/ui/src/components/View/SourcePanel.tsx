import './SourcePanel.scss';

import { FunctionComponent, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { flattenTreeNodes } from '../../utils/flatten-tree-nodes';
import { updateVisiblePortPositions } from '../../utils/update-visible-port-positions';
import { VirtuosoWithVisibility } from '../DataMapper/VirtuosoWithVisibility';
import { DocumentHeader } from '../Document/BaseDocument';
import { ParametersSection } from '../Document/Parameters';
import { SourceDocumentNode } from '../Document/SourceDocumentNode';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
import { ExpansionPanels } from '../ExpansionPanels/ExpansionPanels';
import {
  PANEL_COLLAPSED_HEIGHT,
  PANEL_DEFAULT_HEIGHT,
  PANEL_MIN_HEIGHT,
  VIRTUOSO_OVERSCAN,
} from '../ExpansionPanels/panel-dimensions';

type SourcePanelProps = {
  isReadOnly?: boolean;
  actionItems?: React.ReactNode[];
};

export const SourcePanel: FunctionComponent<SourcePanelProps> = ({ isReadOnly = false, actionItems }) => {
  const { sourceBodyDocument } = useDataMapper();

  // Create tree for source body
  const sourceBodyNodeData = useMemo(() => new DocumentNodeData(sourceBodyDocument), [sourceBodyDocument]);
  const [sourceBodyTree, setSourceBodyTree] = useState<DocumentTree | undefined>(undefined);

  useEffect(() => {
    setSourceBodyTree(TreeUIService.createTree(sourceBodyNodeData));
  }, [sourceBodyNodeData]);

  // Optimize: Select only the expansion state for this document
  const documentExpansionState = useDocumentTreeStore((state) => state.expansionState);

  // Flatten tree based on expansion state
  const flattenedNodes = useMemo(() => {
    if (!sourceBodyTree) return [];
    return flattenTreeNodes(sourceBodyTree.root, (path) => documentExpansionState[path] ?? false);
  }, [sourceBodyTree, documentExpansionState]);

  // Check if body has schema (similar to parameter logic)
  const hasSchema = !sourceBodyNodeData.isPrimitive;

  return (
    <div id="panel-source" className="source-panel">
      <ExpansionPanels firstPanelId="parameters-header" lastPanelId="source-body">
        {/* Parameters section - self-contained component that manages all parameter state */}
        <ParametersSection
          isReadOnly={isReadOnly}
          onLayoutChange={updateVisiblePortPositions}
          actionItems={actionItems}
        />

        {/* Source Body - behaves like parameters: collapsed when no schema */}
        <ExpansionPanel
          id="source-body"
          key="source-body"
          defaultExpanded={hasSchema}
          defaultHeight={hasSchema ? PANEL_DEFAULT_HEIGHT : PANEL_COLLAPSED_HEIGHT}
          minHeight={PANEL_MIN_HEIGHT}
          summary={
            <DocumentHeader
              header={<span className="panel-header-text">Body</span>}
              document={sourceBodyDocument}
              documentType={DocumentType.SOURCE_BODY}
              isReadOnly={isReadOnly}
              enableDnD={false}
              additionalActions={[]}
            />
          }
          onLayoutChange={updateVisiblePortPositions}
        >
          {/* Only render children if body has schema */}
          {hasSchema && sourceBodyTree && (
            <VirtuosoWithVisibility
              totalCount={flattenedNodes.length}
              itemContent={(index) => {
                const flattenedNode = flattenedNodes[index];
                return (
                  <SourceDocumentNode
                    key={flattenedNode.path}
                    treeNode={flattenedNode.treeNode}
                    documentId={sourceBodyNodeData.id}
                    isReadOnly={isReadOnly}
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
