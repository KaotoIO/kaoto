import './SourcePanel.scss';

import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { DocumentContent, DocumentHeader } from '../Document/BaseDocument';
import { ParametersSection } from '../Document/Parameters';
import { SourceDocumentNode } from '../Document/SourceDocumentNode';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
import { ExpansionPanels } from '../ExpansionPanels/ExpansionPanels';
import { PANEL_COLLAPSED_HEIGHT, PANEL_DEFAULT_HEIGHT, PANEL_MIN_HEIGHT } from '../ExpansionPanels/panel-dimensions';

type SourcePanelProps = {
  isReadOnly?: boolean;
  actionItems?: React.ReactNode[];
};

export const SourcePanel: FunctionComponent<SourcePanelProps> = ({ isReadOnly = false, actionItems }) => {
  const { sourceBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  // Create tree for source body
  const sourceBodyNodeData = useMemo(() => new DocumentNodeData(sourceBodyDocument), [sourceBodyDocument]);
  const [sourceBodyTree, setSourceBodyTree] = useState<DocumentTree | undefined>(undefined);

  useEffect(() => {
    setSourceBodyTree(TreeUIService.createTree(sourceBodyNodeData));
  }, [sourceBodyNodeData]);

  // Check if body has schema (similar to parameter logic)
  const hasSchema = !sourceBodyNodeData.isPrimitive;

  // Callback for layout changes (expand/collapse/resize) - triggers immediate mapping line refresh
  const handleLayoutChange = useCallback(() => {
    reloadNodeReferences();
  }, [reloadNodeReferences]);

  return (
    <div id="panel-source" className="source-panel">
      <ExpansionPanels firstPanelId="parameters-header" lastPanelId="source-body">
        {/* Parameters section - self-contained component that manages all parameter state */}
        <ParametersSection
          isReadOnly={isReadOnly}
          onScroll={reloadNodeReferences}
          onLayoutChange={handleLayoutChange}
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
          onScroll={reloadNodeReferences}
          onLayoutChange={handleLayoutChange}
        >
          {/* Only render children if body has schema */}
          {hasSchema && sourceBodyTree && (
            <DocumentContent
              treeNode={sourceBodyTree.root}
              isReadOnly={isReadOnly}
              renderNodes={(childNode, readOnly) => (
                <SourceDocumentNode
                  treeNode={childNode}
                  documentId={sourceBodyNodeData.id}
                  isReadOnly={readOnly}
                  rank={1}
                />
              )}
            />
          )}
        </ExpansionPanel>
      </ExpansionPanels>
    </div>
  );
};
