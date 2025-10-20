import { At, ChevronDown, ChevronRight, Draggable } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, useCallback, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import {
  AddMappingNodeData,
  NodeReference,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { DocumentActions } from './actions/DocumentActions';
import { TargetNodeActions } from './actions/TargetNodeActions';
import { AddMappingNode } from './AddMappingNode';
import './Document.scss';
import { FieldIcon } from './FieldIcon';
import { NodeContainer } from './NodeContainer';
import { NodeTitle } from './NodeTitle';

type DocumentNodeProps = {
  treeNode: DocumentTreeNode;
  documentId: string;
  rank: number;
};

/**
 * Tree-based target node component that uses pre-parsed tree structure
 * for improved performance with large schemas
 */
export const TargetDocumentNode: FunctionComponent<DocumentNodeProps> = ({ treeNode, documentId, rank }) => {
  const { getNodeReference, reloadNodeReferences, setNodeReference } = useCanvas();
  const { isInSelectedMapping, toggleSelectedNodeReference } = useMappingLinks();

  const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
  const nodeData = treeNode.nodeData;

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const isPrimitive = VisualizationService.isPrimitiveDocumentNode(nodeData);
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
    isSource: false,
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  });
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  const showNodeActions = (isDocument && isPrimitive) || !isDocument;
  const { refreshMappingTree } = useDataMapper();
  const handleUpdate = useCallback(() => {
    refreshMappingTree();
  }, [refreshMappingTree]);

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
      data-testid={`node-target-${isSelected ? 'selected-' : ''}${nodeData.id}`}
      className={clsx({ node__container: !isDocument })}
      onClick={handleClickField}
    >
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div className={clsx({ node__header: !isDocument })}>
          <NodeContainer nodeData={nodeData} ref={headerRef} className={clsx({ 'selected-container': isSelected })}>
            <section className="node__row" data-draggable={isDraggable}>
              {hasChildren && (
                <Icon className="node__expand node__spacer" onClick={handleClickToggle}>
                  {isExpanded && <ChevronDown data-testid={`expand-target-icon-${nodeData.title}`} />}
                  {!isExpanded && <ChevronRight data-testid={`collapse-target-icon-${nodeData.title}`} />}
                </Icon>
              )}

              <Icon className="node__spacer" data-drag-handler>
                <Draggable />
              </Icon>

              <FieldIcon className="node__spacer" type={nodeData.type} />

              {isCollectionField && (
                <Icon className="node__spacer">
                  <LayerGroupIcon />
                </Icon>
              )}

              {isAttributeField && (
                <Icon className="node__spacer">
                  <At />
                </Icon>
              )}

              <NodeTitle
                className="node__spacer"
                nodeData={nodeData as TargetFieldNodeData}
                isDocument={isDocument}
                rank={rank}
              />

              {showNodeActions ? (
                <TargetNodeActions
                  className="node__target__actions"
                  nodeData={nodeData as TargetNodeData}
                  onUpdate={handleUpdate}
                />
              ) : (
                <span className="node__target__actions" />
              )}

              {isDocument && <DocumentActions nodeData={nodeData as TargetDocumentNodeData} onRenameClick={() => {}} />}
            </section>
          </NodeContainer>
        </div>

        {hasChildren && isExpanded && (
          <div className={clsx({ node__children: !isDocument })}>
            {treeNode.children.map((childTreeNode) =>
              childTreeNode.nodeData instanceof AddMappingNodeData ? (
                <AddMappingNode nodeData={childTreeNode.nodeData} key={childTreeNode.path} />
              ) : (
                <TargetDocumentNode
                  treeNode={childTreeNode}
                  documentId={documentId}
                  key={childTreeNode.path}
                  rank={rank + 1}
                />
              ),
            )}
          </div>
        )}
      </NodeContainer>
    </div>
  );
};
