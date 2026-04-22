import './SourcePanel.scss';

import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { useConnectionPortSync } from '../../hooks/useConnectionPortSync.hook';
import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { DocumentHeader } from '../Document/BaseDocument';
import { ParametersSection } from '../Document/Parameters';
import { SourceDocumentNodeWithContextMenu } from '../Document/SourceDocumentNode';
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
  const documentExpansionState = useDocumentTreeStore((state) => state.expansionState[sourceBodyNodeData.id] || {});
  const { syncConnectionPorts, virtuosoComponents } = useConnectionPortSync(sourceBodyNodeData.id);

  // Flatten tree based on expansion state
  const flattenedNodes = useMemo(() => {
    if (!sourceBodyTree) return [];
    return sourceBodyTree.flatten(documentExpansionState);
  }, [sourceBodyTree, documentExpansionState]);

  // Recalculate connection ports when flattened nodes change (expand/collapse)
  useEffect(() => {
    syncConnectionPorts();
  }, [flattenedNodes.length, syncConnectionPorts]);

  const renderSourceItem = useCallback(
    (index: number) => {
      const flattenedNode = flattenedNodes[index];
      return (
        <SourceDocumentNodeWithContextMenu
          key={flattenedNode.path}
          treeNode={flattenedNode.treeNode}
          documentId={sourceBodyNodeData.id}
          isReadOnly={isReadOnly}
          rank={flattenedNode.depth + 1}
        />
      );
    },
    [flattenedNodes, sourceBodyNodeData.id, isReadOnly],
  );

  // Check if body has schema (similar to parameter logic)
  const hasSchema = !sourceBodyNodeData.isPrimitive;

  // Edge markers for virtual scroll connection ports
  const edgeMarkers = useMemo(
    () => [
      <span
        key="edge-top"
        className="expansion-panel__edge-marker expansion-panel__edge-marker--top expansion-panel__edge-marker--source"
        data-connection-port="true"
        data-document-id={sourceBodyNodeData.id}
        data-node-path={`${sourceBodyDocument.documentId}:EDGE:top`}
      />,
      <span
        key="edge-bottom"
        className="expansion-panel__edge-marker expansion-panel__edge-marker--bottom expansion-panel__edge-marker--source"
        data-connection-port="true"
        data-document-id={sourceBodyNodeData.id}
        data-node-path={`${sourceBodyDocument.documentId}:EDGE:bottom`}
      />,
    ],
    [sourceBodyNodeData.id, sourceBodyDocument.documentId],
  );

  return (
    <div id="panel-source" className="source-panel">
      <ExpansionPanels firstPanelId="parameters-header" lastPanelId="source-body">
        {/* Parameters section - self-contained component that manages all parameter state */}
        <ParametersSection isReadOnly={isReadOnly} onLayoutChange={syncConnectionPorts} actionItems={actionItems} />

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
              additionalActions={edgeMarkers}
            />
          }
          onLayoutChange={syncConnectionPorts}
        >
          {/* Only render children if body has schema */}
          {hasSchema && sourceBodyTree && (
            <Virtuoso
              totalCount={flattenedNodes.length}
              components={virtuosoComponents}
              itemContent={renderSourceItem}
              overscan={VIRTUOSO_OVERSCAN}
            />
          )}
        </ExpansionPanel>
      </ExpansionPanels>
    </div>
  );
};
