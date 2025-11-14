import clsx from 'clsx';
import { FunctionComponent, MouseEvent, useCallback, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { NodeReference } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { NodeContainer } from './NodeContainer';
import { BaseNode } from './Nodes/BaseNode';
import { NodeTitle } from './NodeTitle';

type TreeSourceNodeProps = {
  treeNode: DocumentTreeNode;
  documentId: string;
  isReadOnly: boolean;
  rank: number;
};

/**
 * Tree-based source node component that uses pre-parsed tree structure
 * for improved performance with large schemas
 */
export const SourceDocumentNode: FunctionComponent<TreeSourceNodeProps> = ({
  treeNode,
  documentId,
  isReadOnly,
  rank,
}) => {
  const { getNodeReference, reloadNodeReferences, setNodeReference } = useCanvas();
  const { isInSelectedMapping, toggleSelectedNodeReference } = useMappingLinks();

  const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
  const nodeData = treeNode.nodeData;

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const hasChildren = VisualizationService.hasChildren(nodeData);

  const handleClickToggle = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      if (!hasChildren) return;

      TreeUIService.toggleNode(documentId, treeNode.path);
      reloadNodeReferences();
    },
    [hasChildren, documentId, treeNode.path, reloadNodeReferences],
  );

  const isCollectionField = VisualizationService.isCollectionField(nodeData);
  const isAttributeField = VisualizationService.isAttributeField(nodeData);
  const isDraggable = !isDocument || VisualizationService.isPrimitiveDocumentNode(nodeData);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefId = nodeData.path.toString();
  const nodeReference = useRef<NodeReference>({
    path: nodeRefId,
    isSource: true,
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  });
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  const isSelected = isInSelectedMapping(nodeReference);
  const handleClickField = useCallback(
    (event: MouseEvent) => {
      toggleSelectedNodeReference(nodeReference);
      event.stopPropagation();
    },
    [toggleSelectedNodeReference],
  );

  return (
    <div
      data-testid={`node-source-${nodeData.id}`}
      data-selected={isSelected}
      className="node__container"
      onClick={handleClickField}
    >
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div className="node__header">
          <NodeContainer nodeData={nodeData} ref={headerRef} className={clsx({ 'selected-container': isSelected })}>
            <BaseNode
              data-testid={nodeData.title}
              isExpandable={hasChildren}
              isExpanded={isExpanded}
              onExpandChange={handleClickToggle}
              isDraggable={isDraggable}
              iconType={nodeData.type}
              isCollectionField={isCollectionField}
              isAttributeField={isAttributeField}
              title={<NodeTitle className="node__spacer" nodeData={nodeData} isDocument={isDocument} rank={rank} />}
              rank={rank}
              isSelected={isSelected}
            ></BaseNode>
          </NodeContainer>
        </div>

        {hasChildren && isExpanded && (
          <div className="node__children">
            {treeNode.children.map((childTreeNode) => (
              <SourceDocumentNode
                treeNode={childTreeNode}
                documentId={documentId}
                key={childTreeNode.path}
                isReadOnly={isReadOnly}
                rank={rank + 1}
              />
            ))}
          </div>
        )}
      </NodeContainer>
    </div>
  );
};
