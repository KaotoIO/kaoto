import { Icon, StackItem } from '@patternfly/react-core';
import { AngleDownIcon, AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, useCallback, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import { DocumentNodeData, NodeData, NodeReference } from '../../models/datamapper/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { DocumentActions } from './actions/DocumentActions';
import './Document.scss';
import { NodeContainer } from './NodeContainer';
import { NodeTitle } from './NodeTitle';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { useToggle } from '../../hooks/useToggle';
import { ParameterInputPlaceholder } from './Parameters';

type DocumentProps = {
  document: IDocument;
  isReadOnly: boolean;
};

export const SourceDocument: FunctionComponent<DocumentProps> = ({ document, isReadOnly }) => {
  const { initialExpandedFieldRank, maxTotalFieldCountToExpandAll } = useDataMapper();
  const nodeData = new DocumentNodeData(document);
  return (
    <SourceDocumentNode
      nodeData={nodeData}
      isReadOnly={isReadOnly}
      expandAll={document.totalFieldCount < maxTotalFieldCountToExpandAll}
      initialExpandedRank={initialExpandedFieldRank}
      rank={0}
    />
  );
};

type DocumentNodeProps = {
  nodeData: NodeData;
  isReadOnly: boolean;
  expandAll: boolean;
  initialExpandedRank: number;
  rank: number;
};

export const SourceDocumentNode: FunctionComponent<DocumentNodeProps> = ({
  nodeData,
  isReadOnly,
  expandAll,
  initialExpandedRank,
  rank,
}) => {
  const { getNodeReference, reloadNodeReferences, setNodeReference } = useCanvas();
  const { isInSelectedMapping, toggleSelectedNodeReference } = useMappingLinks();
  const {
    state: isRenamingParameter,
    toggleOn: toggleOnRenamingParameter,
    toggleOff: toggleOffRenamingParameter,
  } = useToggle(false);

  const shouldCollapseByDefault =
    !expandAll && VisualizationService.shouldCollapseByDefault(nodeData, initialExpandedRank, rank);
  const [collapsed, setCollapsed] = useState(shouldCollapseByDefault);

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const hasChildren = VisualizationService.hasChildren(nodeData);

  const handleClickToggle = useCallback(
    (event: MouseEvent) => {
      if (!hasChildren) return;

      setCollapsed(!collapsed);
      event.stopPropagation();
      reloadNodeReferences();
    },
    [collapsed, hasChildren, reloadNodeReferences],
  );

  const children = collapsed ? [] : VisualizationService.generateNodeDataChildren(nodeData);
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
                <Icon className="node__spacer" onClick={handleClickToggle}>
                  <AngleDownIcon
                    data-testid={`expand-source-icon-${nodeData.title}`}
                    className={clsx('toggle-icon', { 'toggle-icon--collapsed': collapsed })}
                  />
                </Icon>
              )}

              <Icon className="node__spacer" data-drag-handler>
                <GripVerticalIcon />
              </Icon>

              {isCollectionField && (
                <Icon className="node__spacer">
                  <LayerGroupIcon />
                </Icon>
              )}

              {isAttributeField && (
                <Icon className="node__spacer">
                  <AtIcon />
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
                <NodeTitle className="node__spacer" nodeData={nodeData} isDocument={isDocument} />
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

        {hasChildren && !collapsed && (
          <div className={clsx({ node__children: !isDocument })}>
            {children.map((child) => (
              <SourceDocumentNode
                nodeData={child}
                key={child.id}
                isReadOnly={isReadOnly}
                initialExpandedRank={initialExpandedRank}
                rank={rank + 1}
                expandAll={expandAll}
              />
            ))}
          </div>
        )}
      </NodeContainer>
    </div>
  );
};
