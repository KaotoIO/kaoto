import './BaseDocument.scss';

import { ChevronDown, ChevronRight, Draggable } from '@carbon/icons-react';
import { ActionListGroup, ActionListItem, Icon } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { DocumentType, IDocument } from '../../models/datamapper/document';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { DocumentNodeData, NodeReference } from '../../models/datamapper/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { TreeUIService } from '../../services/tree-ui.service';
import { useDocumentTreeStore } from '../../store';
import { AttachSchemaButton } from './actions/AttachSchemaButton';
import { DetachSchemaButton } from './actions/DetachSchemaButton';
import { NodeContainer } from './NodeContainer';

type DocumentProps = {
  header: ReactNode;
  treeNode: DocumentTreeNode;
  documentId: string;
  isReadOnly: boolean;
  additionalActions?: React.ReactNode[];
  renderNodes?: (childNode: DocumentTreeNode, isReadOnly: boolean) => ReactNode; // Function to render child nodes
};

/**
 * Document component - Pure composition container for document roots
 * Handles document header, actions, and delegates child rendering via renderNodes
 */
export const BaseDocument: FunctionComponent<DocumentProps> = ({
  header,
  treeNode,
  documentId,
  isReadOnly,
  additionalActions = [],
  renderNodes,
}) => {
  const { getNodeReference, setNodeReference, reloadNodeReferences } = useCanvas();
  const { isInSelectedMapping, toggleSelectedNodeReference } = useMappingLinks();

  const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
  const nodeData = treeNode.nodeData;
  const { mappingTree } = useDataMapper();

  if (!nodeData.document) {
    throw new Error('BaseDocument requires a document node');
  }

  const documentType = nodeData.document.documentType;
  const documentReferenceId = nodeData.document.getReferenceId(mappingTree.namespaceMap);
  const hasChildren = VisualizationService.hasChildren(nodeData);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefId = nodeData.path.toString();
  const nodeReference = useRef<NodeReference>({
    path: nodeRefId,
    isSource: nodeData.isSource,
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  });
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  const handleClickToggle = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!hasChildren) return;
      TreeUIService.toggleNode(documentId, treeNode.path);
      reloadNodeReferences();
    },
    [hasChildren, documentId, treeNode.path, reloadNodeReferences],
  );

  const isSelected = isInSelectedMapping(nodeReference);
  const handleClickField = useCallback(
    (event: MouseEvent) => {
      toggleSelectedNodeReference(nodeReference);
      event.stopPropagation();
    },
    [toggleSelectedNodeReference],
  );
  const handleStopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  const isSourceBodyDocument = nodeData.document.documentType === DocumentType.SOURCE_BODY;

  return (
    <div
      data-testid={`document-${nodeData.id}`}
      data-selected={isSelected}
      className={'document__container'}
      onClick={handleClickField}
    >
      <NodeContainer ref={containerRef} nodeData={nodeData} enableDnD={!isSourceBodyDocument}>
        <div ref={headerRef} className={clsx('document__header', { 'selected-container': isSelected })}>
          <Icon className="node__expand node__spacer" onClick={hasChildren ? handleClickToggle : undefined}>
            {hasChildren && isExpanded && <ChevronDown data-testid={`expand-icon-${nodeData.title}`} />}
            {hasChildren && !isExpanded && <ChevronRight data-testid={`collapse-icon-${nodeData.title}`} />}
          </Icon>
          <Icon className="node__spacer" data-drag-handler>
            <Draggable />
          </Icon>
          {header}
          {/* Document-level actions */}
          <ActionListGroup
            key={`document-actions-${documentId}`}
            onClick={handleStopPropagation}
            className={'document__actions'}
          >
            {!isReadOnly && (
              <>
                {additionalActions}
                <ActionListItem>
                  <AttachSchemaButton
                    documentType={documentType}
                    documentId={nodeData.document.documentId}
                    documentReferenceId={documentReferenceId}
                    hasSchema={!nodeData.isPrimitive}
                  />
                </ActionListItem>
                <ActionListItem>
                  <DetachSchemaButton
                    documentType={documentType}
                    documentId={nodeData.document.documentId}
                    documentReferenceId={documentReferenceId}
                  />
                </ActionListItem>
              </>
            )}
          </ActionListGroup>
        </div>

        {hasChildren && isExpanded && renderNodes && (
          <div className={clsx({ node__children: false })}>
            {treeNode.children.map((childTreeNode) => (
              <div key={childTreeNode.path}>{renderNodes(childTreeNode, isReadOnly)}</div>
            ))}
          </div>
        )}
      </NodeContainer>
    </div>
  );
};

// ============================================================================
// New ExpansionPanel-based architecture components
// ============================================================================

type DocumentContentProps = {
  treeNode: DocumentTreeNode;
  documentId: string;
  isReadOnly: boolean;
  renderNodes: (childNode: DocumentTreeNode, isReadOnly: boolean) => ReactNode;
};

/**
 * Generic document content component - renders child nodes only
 * Does NOT register node reference for document root (DocumentHeader handles that)
 * Does NOT handle expand/collapse (ExpansionPanel handles that in new architecture)
 *
 * This is the content portion extracted from BaseDocument, making it reusable
 * for both source and target documents in the new ExpansionPanel-based architecture.
 */
export const DocumentContent: FunctionComponent<DocumentContentProps> = ({ treeNode, isReadOnly, renderNodes }) => {
  return (
    <div className="document-content">
      {treeNode.children.map((childTreeNode) => (
        <div key={childTreeNode.path}>{renderNodes(childTreeNode, isReadOnly)}</div>
      ))}
    </div>
  );
};

type DocumentHeaderProps = {
  header: ReactNode;
  document: IDocument;
  documentType: DocumentType;
  isReadOnly: boolean;
  additionalActions?: ReactNode[];
  enableDnD?: boolean;
};

/**
 * Generic document header component with attach/detach schema buttons
 * Reusable across parameters, source body, and target body
 * Registers node references for mapping lines and handles selection
 */
export const DocumentHeader: FunctionComponent<DocumentHeaderProps> = ({
  header,
  document,
  documentType,
  isReadOnly,
  additionalActions = [],
  enableDnD = false,
}) => {
  const { mappingTree } = useDataMapper();
  const { getNodeReference, setNodeReference } = useCanvas();
  const { isInSelectedMapping, toggleSelectedNodeReference } = useMappingLinks();

  const nodeData = useMemo(() => new DocumentNodeData(document), [document]);
  const documentReferenceId = document.getReferenceId(mappingTree.namespaceMap);
  const hasSchema = !nodeData.isPrimitive;

  // Create refs for node reference registration (needed for mapping lines)
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefId = nodeData.path.toString();
  const nodeReference = useRef<NodeReference>({
    path: nodeRefId,
    isSource: nodeData.isSource,
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  });

  // Register node reference for mapping lines
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  // Check if this node is in a selected mapping
  const isSelected = isInSelectedMapping(nodeReference);

  // Click handler for selecting/deselecting this node for mapping
  // Note: We don't stop propagation to allow ExpansionPanel toggle to work
  const handleClickField = useCallback(
    (_event: MouseEvent) => {
      toggleSelectedNodeReference(nodeReference);
    },
    [toggleSelectedNodeReference],
  );

  const handleStopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  const headerContent = (
    <div ref={headerRef} className={clsx('document-header', { 'selected-container': isSelected })}>
      {enableDnD && (
        <Icon className="node__spacer" data-drag-handler>
          <Draggable />
        </Icon>
      )}
      <div className="document-header__title">{header}</div>
      {!isReadOnly && (
        <ActionListGroup className="document-header__actions" onClick={handleStopPropagation}>
          <ActionListItem>
            <AttachSchemaButton
              documentType={documentType}
              documentId={document.documentId}
              documentReferenceId={documentReferenceId}
              hasSchema={hasSchema}
            />
          </ActionListItem>
          <ActionListItem>
            <DetachSchemaButton
              documentType={documentType}
              documentId={document.documentId}
              documentReferenceId={documentReferenceId}
            />
          </ActionListItem>
          {additionalActions}
        </ActionListGroup>
      )}
    </div>
  );

  // Always wrap in container div for containerRef and click handling
  // Conditionally wrap in NodeContainer for DnD functionality (primitives only)
  return (
    <div
      ref={containerRef}
      data-testid={`document-${nodeData.id}`}
      data-selected={isSelected}
      onClick={handleClickField}
      className="document-header__container"
    >
      {enableDnD ? (
        <NodeContainer nodeData={nodeData} enableDnD={true}>
          {headerContent}
        </NodeContainer>
      ) : (
        headerContent
      )}
    </div>
  );
};
