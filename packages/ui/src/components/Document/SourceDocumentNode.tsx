import { At, ChevronDown, ChevronRight, Draggable } from '@carbon/icons-react';
import { Icon, StackItem } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, useCallback, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { useToggle } from '../../hooks/useToggle';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { NodeReference } from '../../models/datamapper/visualization';
import { TreeParsingService } from '../../services/tree-parsing.service';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { DocumentActions } from './actions/DocumentActions';
import './Document.scss';
import { FieldIcon } from './FieldIcon';
import { NodeContainer } from './NodeContainer';
import { NodeTitle } from './NodeTitle';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';

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
  const {
    state: isRenamingParameter,
    toggleOn: toggleOnRenamingParameter,
    toggleOff: toggleOffRenamingParameter,
  } = useToggle(false);

  const isExpanded = useDocumentTreeStore((state) => state.isExpanded(documentId, treeNode.path));
  const nodeData = treeNode.nodeData;

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const hasChildren = TreeParsingService.canNodeHaveChildren(nodeData);

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
      data-testid={`node-source-${isSelected ? 'selected-' : ''}${nodeData.id}`}
      className={clsx({ node__container: !isDocument })}
      onClick={handleClickField}
    >
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div className={clsx({ node__header: !isDocument })}>
          <NodeContainer nodeData={nodeData} ref={headerRef} className={clsx({ 'selected-container': isSelected })}>
            <section className="node__row" data-draggable={isDraggable}>
              {hasChildren && (
                <Icon className="node__expand node__spacer" onClick={handleClickToggle}>
                  {isExpanded && <ChevronDown data-testid={`expand-source-icon-${nodeData.title}`} />}
                  {!isExpanded && <ChevronRight data-testid={`collapse-source-icon-${nodeData.title}`} />}
                </Icon>
              )}

              <Icon className="node__spacer" data-drag-handler>
                <Draggable />
              </Icon>

              <FieldIcon className="node__spacer" type={nodeData.type} />

              {isCollectionField && (
                <Icon className="node__spacer" data-testid="collection-field-icon">
                  <LayerGroupIcon />
                </Icon>
              )}

              {isAttributeField && (
                <Icon className="node__spacer" data-testid="attribute-field-icon">
                  <At />
                </Icon>
              )}

              {isRenamingParameter && (
                <StackItem>
                  <ParameterInputPlaceholder
                    onComplete={() => toggleOffRenamingParameter()}
                    parameter={nodeData.title}
                  />
                </StackItem>
              )}

              {!isRenamingParameter && (
                <NodeTitle
                  className="node__spacer"
                  data-rank={rank}
                  nodeData={nodeData}
                  isDocument={isDocument}
                  rank={rank}
                />
              )}

              {!isRenamingParameter && !isReadOnly && isDocument ? (
                <DocumentActions
                  className="node__target__actions"
                  nodeData={nodeData}
                  onRenameClick={() => toggleOnRenamingParameter()}
                />
              ) : (
                <span className="node__target__actions" />
              )}
            </section>
          </NodeContainer>
        </div>

        {hasChildren && isExpanded && (
          <div className={clsx({ node__children: !isDocument })}>
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
