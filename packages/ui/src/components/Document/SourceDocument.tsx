import { DocumentNodeData, MappingNodeData, NodeData } from '../../models/datamapper/visualization';
import { FunctionComponent, useCallback, useRef, useState } from 'react';
import { IDocument } from '../../models/datamapper/document';
import { Label, Split, SplitItem, Title, Truncate } from '@patternfly/react-core';
import { DocumentActions } from './actions/DocumentActions';
import { AngleDownIcon, AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import { NodeContainer } from './NodeContainer';
import { NodeReference } from '../../providers/datamapper-canvas.provider';
import { useCanvas } from '../../hooks/useCanvas';
import { VisualizationService } from '../../services/visualization.service';
import './Document.scss';
import { useDataMapper } from '../../hooks/useDataMapper';

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

  const nodeTitle =
    nodeData instanceof MappingNodeData ? (
      <Label>
        <Truncate content={nodeData.title ?? ''} className="truncate" />
      </Label>
    ) : isDocument ? (
      <Title headingLevel="h5">
        <Truncate content={nodeData.title ?? ''} className="truncate" />
      </Title>
    ) : (
      <Truncate content={nodeData.title ?? ''} className="truncate" />
    );

  return (
    <NodeContainer ref={containerRef} nodeData={nodeData}>
      <div
        className={isDocument ? 'node-container__document' : 'node-container'}
        data-testid={`node-source-${nodeData.id}`}
      >
        <NodeContainer ref={headerRef} nodeData={nodeData}>
          <div
            className={isDocument ? 'node-header__document' : 'node-header'}
            onClick={hasChildren ? onClick : undefined}
          >
            <Split hasGutter className="node-split">
              <SplitItem>
                {hasChildren && <AngleDownIcon className={`${collapsed ? 'toggle-icon-collapsed' : ''}`} />}
              </SplitItem>
              <SplitItem>
                <GripVerticalIcon />
              </SplitItem>
              {isCollectionField && (
                <SplitItem>
                  <LayerGroupIcon />
                </SplitItem>
              )}
              {isAttributeField && (
                <SplitItem>
                  <AtIcon />
                </SplitItem>
              )}
              <SplitItem isFilled>{nodeTitle}</SplitItem>
              {!isReadOnly && <SplitItem>{isDocument && <DocumentActions nodeData={nodeData} />}</SplitItem>}
            </Split>
          </div>
        </NodeContainer>
        {hasChildren && !collapsed && (
          <div className={isDocument ? 'node-children__document' : 'node-children'}>
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
      </div>
    </NodeContainer>
  );
};
