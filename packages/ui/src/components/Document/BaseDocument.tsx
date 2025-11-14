import { ActionListGroup, ActionListItem, Icon } from '@patternfly/react-core';
import { ChevronDown, ChevronRight, Draggable } from '@carbon/icons-react';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, ReactNode, useCallback, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { DocumentType } from '../../models/datamapper/document';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { NodeReference } from '../../models/datamapper/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { TreeUIService } from '../../services/tree-ui.service';
import { useDocumentTreeStore } from '../../store';
import { NodeContainer } from './NodeContainer';
import { AttachSchemaButton } from './actions/AttachSchemaButton';
import { DetachSchemaButton } from './actions/DetachSchemaButton';
import { useDataMapper } from '../../hooks/useDataMapper';
import './BaseDocument.scss';

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
