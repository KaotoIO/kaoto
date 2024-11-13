import { Icon } from '@patternfly/react-core';
import { AngleDownIcon, AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import { DocumentNodeData, NodeData } from '../../models/datamapper/visualization';
import { NodeReference } from '../../providers/datamapper-canvas.provider';
import { VisualizationService } from '../../services/visualization.service';
import { DocumentActions } from './actions/DocumentActions';
import './Document.scss';
import { NodeContainer } from './NodeContainer';
import { NodeTitle } from './NodeTitle';

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
  const shouldCollapseByDefault =
    !expandAll && VisualizationService.shouldCollapseByDefault(nodeData, initialExpandedRank, rank);
  const [collapsed, setCollapsed] = useState(shouldCollapseByDefault);

  const onClick = useCallback(() => {
    setCollapsed(!collapsed);
    reloadNodeReferences();
  }, [collapsed, reloadNodeReferences]);

  const isDocument = nodeData instanceof DocumentNodeData;
  const hasChildren = VisualizationService.hasChildren(nodeData);
  const children = collapsed ? [] : VisualizationService.generateNodeDataChildren(nodeData);
  const isCollectionField = VisualizationService.isCollectionField(nodeData);
  const isAttributeField = VisualizationService.isAttributeField(nodeData);
  const isDraggable = !isDocument || VisualizationService.isPrimitiveDocumentNode(nodeData);
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeReference = useRef<NodeReference>({
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  });
  const nodeRefId = nodeData.path.toString();
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  return (
    <div data-testid={`node-source-${nodeData.id}`} className={clsx({ node__container: !isDocument })}>
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div className={clsx({ node__header: !isDocument })} onClick={onClick}>
          <NodeContainer ref={headerRef} nodeData={nodeData}>
            <section className="node__row" data-draggable={isDraggable}>
              {hasChildren && <AngleDownIcon className={clsx({ 'toggle-icon-collapsed': collapsed })} />}

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

              <NodeTitle className="node__spacer" nodeData={nodeData} isDocument={isDocument} />

              {!isReadOnly && isDocument ? (
                <DocumentActions className="node__target__actions" nodeData={nodeData} />
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
