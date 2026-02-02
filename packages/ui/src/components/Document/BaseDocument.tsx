import './BaseDocument.scss';

import { Draggable } from '@carbon/icons-react';
import { ActionListGroup, ActionListItem, Icon } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, ReactNode, useCallback, useMemo } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType, IDocument } from '../../models/datamapper/document';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store';
import { AttachSchemaButton } from './actions/AttachSchema';
import { DetachSchemaButton } from './actions/DetachSchemaButton';
import { NodeContainer } from './NodeContainer';

// ============================================================================
// ExpansionPanel-based architecture components
// ============================================================================

type DocumentContentProps = {
  treeNode: DocumentTreeNode;
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
  nodeData?: DocumentNodeData; // Optional: use existing nodeData instead of creating new one
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
  nodeData: externalNodeData,
}) => {
  const { mappingTree } = useDataMapper();
  const toggleSelectedNode = useDocumentTreeStore((state) => state.toggleSelectedNode);

  const nodeData = useMemo(() => externalNodeData || new DocumentNodeData(document), [externalNodeData, document]);
  const documentReferenceId = document.getReferenceId(mappingTree.namespaceMap);
  const hasSchema = !nodeData.isPrimitive;

  const nodePathString = nodeData.path.toString();

  // Get selection state from store
  const isSelected = useDocumentTreeStore((state) => state.isNodeSelected(nodePathString));

  // Click handler for selecting/deselecting this node for mapping
  // Note: We don't stop propagation to allow ExpansionPanel toggle to work
  const handleClickField = useCallback(
    (_event: MouseEvent) => {
      toggleSelectedNode(nodePathString, nodeData.isSource);
    },
    [toggleSelectedNode, nodePathString, nodeData.isSource],
  );

  const handleStopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  const headerContent = (
    <div className={clsx('document-header', { 'selected-container': isSelected })}>
      {enableDnD && (
        <Icon className="node__spacer" data-drag-handler>
          <Draggable />
        </Icon>
      )}
      <div className="document-header__title">{header}</div>
      {!isReadOnly && (
        <ActionListGroup className="document__actions" onClick={handleStopPropagation}>
          {additionalActions}
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
        </ActionListGroup>
      )}
    </div>
  );

  // Always wrap in container div for click handling
  // Conditionally wrap in NodeContainer for DnD functionality (primitives only)
  return (
    <div
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
