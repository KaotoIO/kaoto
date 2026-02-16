import { Icon } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, useCallback, useMemo, useRef, useState } from 'react';

import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { IFieldTypeInfo, TypeOverrideVariant } from '../../models/datamapper/types';
import { FieldItemNodeData, FieldNodeData, NodeReference } from '../../models/datamapper/visualization';
import { FieldTypeOverrideService } from '../../services/field-type-override.service';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { TypeOverrideModal } from './actions/TypeOverrideModal';
import { FieldContextMenu } from './actions/FieldContextMenu';
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
  const { mappingTree, updateDocument } = useDataMapper();

  const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
  const nodeData = treeNode.nodeData;

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const hasChildren = VisualizationService.hasChildren(nodeData);

  // Context menu state
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isTypeOverrideModalOpen, setIsTypeOverrideModalOpen] = useState(false);

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

  // Type override detection and handlers
  const isFieldNode = nodeData instanceof FieldNodeData || nodeData instanceof FieldItemNodeData;
  const field = isFieldNode ? (nodeData as FieldNodeData | FieldItemNodeData).field : undefined;
  const hasTypeOverride = field && field.typeOverride !== TypeOverrideVariant.NONE;

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (!isFieldNode || isReadOnly) return;
      event.preventDefault();
      event.stopPropagation();
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setShowContextMenu(true);
    },
    [isFieldNode, isReadOnly],
  );

  const handleOverrideType = useCallback(() => {
    setIsTypeOverrideModalOpen(true);
  }, []);

  const handleResetOverride = useCallback(() => {
    if (field) {
      const document = field.ownerDocument;
      const namespaceMap = mappingTree.namespaceMap;
      const previousRefId = document.getReferenceId(namespaceMap);
      FieldTypeOverrideService.revertFieldTypeOverride(document, field, namespaceMap);
      updateDocument(document, document.definition, previousRefId);
      reloadNodeReferences();
    }
  }, [field, mappingTree.namespaceMap, updateDocument, reloadNodeReferences]);

  const handleTypeOverrideSave = useCallback(
    (selectedType: IFieldTypeInfo) => {
      if (field) {
        const document = field.ownerDocument;
        const namespaceMap = mappingTree.namespaceMap;
        const previousRefId = document.getReferenceId(namespaceMap);
        FieldTypeOverrideService.applyFieldTypeOverride(
          document,
          field,
          selectedType,
          namespaceMap,
          TypeOverrideVariant.SAFE,
        );
        updateDocument(document, document.definition, previousRefId);
        reloadNodeReferences();
        setIsTypeOverrideModalOpen(false);
      }
    },
    [field, mappingTree.namespaceMap, updateDocument, reloadNodeReferences],
  );

  const handleTypeOverrideRemove = useCallback(() => {
    handleResetOverride();
    setIsTypeOverrideModalOpen(false);
  }, [handleResetOverride]);

  // Visual indicator for type override
  const typeOverrideIndicator = useMemo(() => {
    if (hasTypeOverride && field) {
      return (
        <Icon
          className="node__spacer"
          size="sm"
          status="warning"
          isInline
          title={`Type overridden: ${field.originalType} → ${field.type}`}
        >
          <WrenchIcon />
        </Icon>
      );
    }
    return null;
  }, [hasTypeOverride, field]);

  return (
    <>
      <div
        data-testid={`node-source-${nodeData.id}`}
        data-selected={isSelected}
        className="node__container"
        onClick={handleClickField}
        onContextMenu={handleContextMenu}
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
                typeOverrideIndicator={typeOverrideIndicator}
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

      {/* Context Menu */}
      {showContextMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
          onClick={() => setShowContextMenu(false)}
        >
          <div
            style={{
              position: 'absolute',
              left: contextMenuPosition.x,
              top: contextMenuPosition.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <FieldContextMenu
              hasOverride={hasTypeOverride}
              onOverrideType={handleOverrideType}
              onResetOverride={handleResetOverride}
              onClose={() => setShowContextMenu(false)}
            />
          </div>
        </div>
      )}

      {/* Type Override Modal */}
      {isTypeOverrideModalOpen && field && (
        <TypeOverrideModal
          isOpen={isTypeOverrideModalOpen}
          field={field}
          onSave={handleTypeOverrideSave}
          onRemove={handleTypeOverrideRemove}
          onClose={() => setIsTypeOverrideModalOpen(false)}
        />
      )}
    </>
  );
};
