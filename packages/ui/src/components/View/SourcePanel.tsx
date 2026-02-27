import './SourcePanel.scss';

import { forwardRef, FunctionComponent, useEffect, useMemo, useState } from 'react';
import { Virtuoso, VirtuosoProps } from 'react-virtuoso';

import { useDataMapper } from '../../hooks/useDataMapper';
import { useDocumentScroll } from '../../hooks/useDocumentScroll.hook';
import { DocumentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { flattenTreeNodes } from '../../utils/flatten-tree-nodes';
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

// Scroller component that wraps scroll handling for Virtuoso
const createScrollerComponent = (onScrollCallback: () => void) => {
  return forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>((props, ref) => (
    <div
      {...props}
      ref={ref}
      onScroll={() => {
        onScrollCallback();
      }}
    />
  ));
};

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
  const onScroll = useDocumentScroll(sourceBodyNodeData.id);

  // Flatten tree based on expansion state
  const flattenedNodes = useMemo(() => {
    if (!sourceBodyTree) return [];
    return flattenTreeNodes(sourceBodyTree.root, (path) => documentExpansionState[path] ?? false);
  }, [sourceBodyTree, documentExpansionState]);

  // Check if body has schema (similar to parameter logic)
  const hasSchema = !sourceBodyNodeData.isPrimitive;

  // Memoize the Virtuoso components object to prevent recreation on every render
  const virtuosoComponents = useMemo<VirtuosoProps<unknown, unknown>['components']>(
    () => ({
      Scroller: createScrollerComponent(onScroll),
    }),
    [onScroll],
  );

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
        <ParametersSection isReadOnly={isReadOnly} onLayoutChange={onScroll} actionItems={actionItems} />

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
          onLayoutChange={onScroll}
        >
          {/* Only render children if body has schema */}
          {hasSchema && sourceBodyTree && (
            <Virtuoso
              totalCount={flattenedNodes.length}
              components={virtuosoComponents}
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
