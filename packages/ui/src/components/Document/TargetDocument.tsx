import { Icon, Label, Title, Truncate } from '@patternfly/react-core';
import { AngleDownIcon, AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import { MappingNodeData, TargetDocumentNodeData, TargetNodeData } from '../../models/datamapper/visualization';
import { NodeReference } from '../../providers/datamapper-canvas.provider';
import { VisualizationService } from '../../services/visualization.service';
import { DocumentActions } from './actions/DocumentActions';
import { TargetNodeActions } from './actions/TargetNodeActions';
import './Document.scss';
import { NodeContainer } from './NodeContainer';

type DocumentProps = {
  document: IDocument;
};

export const TargetDocument: FunctionComponent<DocumentProps> = ({ document }) => {
  const { initialExpandedFieldRank, mappingTree, maxTotalFieldCountToExpandAll } = useDataMapper();
  const nodeData = new TargetDocumentNodeData(document, mappingTree);

  return (
    <TargetDocumentNode
      nodeData={nodeData}
      expandAll={document.totalFieldCount < maxTotalFieldCountToExpandAll}
      initialExpandedRank={initialExpandedFieldRank}
      rank={0}
    />
  );
};

type DocumentNodeProps = {
  nodeData: TargetNodeData;
  expandAll: boolean;
  initialExpandedRank: number;
  rank: number;
};

const TargetDocumentNode: FunctionComponent<DocumentNodeProps> = ({
  nodeData,
  expandAll,
  initialExpandedRank,
  rank,
}) => {
  const { getNodeReference, reloadNodeReferences, setNodeReference } = useCanvas();
  const shouldCollapseByDefault =
    !expandAll && VisualizationService.shouldCollapseByDefault(nodeData, initialExpandedRank, rank);
  const [collapsed, setCollapsed] = useState(shouldCollapseByDefault);

  const onClick = useCallback(() => {
    if (!hasChildren) return;

    setCollapsed(!collapsed);
    reloadNodeReferences();
  }, [collapsed, reloadNodeReferences]);

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const isPrimitive = VisualizationService.isPrimitiveDocumentNode(nodeData);
  const hasChildren = VisualizationService.hasChildren(nodeData);
  const children = VisualizationService.generateNodeDataChildren(nodeData) as TargetNodeData[];
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

  const showNodeActions = (isDocument && isPrimitive) || !isDocument;
  const { refreshMappingTree } = useDataMapper();
  const handleUpdate = useCallback(() => {
    refreshMappingTree();
  }, [refreshMappingTree]);

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
    <div data-testid={`node-target-${nodeData.id}`} className={clsx({ node__container: !isDocument })}>
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div className={clsx({ node__header: !isDocument })} onClick={onClick}>
          <NodeContainer ref={headerRef} nodeData={nodeData}>
            <section className="node__row">
              {hasChildren && <AngleDownIcon className={clsx({ 'toggle-icon-collapsed': collapsed })} />}

              <Icon className="node__drag">
                <GripVerticalIcon />
              </Icon>

              {isCollectionField && <LayerGroupIcon />}

              {isAttributeField && <AtIcon />}

              {nodeTitle}

              {showNodeActions ? (
                <TargetNodeActions className="node__target__actions" nodeData={nodeData} onUpdate={handleUpdate} />
              ) : (
                <span className="node__target__actions" />
              )}

              {isDocument && <DocumentActions nodeData={nodeData as TargetDocumentNodeData} />}
            </section>
          </NodeContainer>
        </div>

        {hasChildren && !collapsed && (
          <div className={clsx({ node__children: !isDocument })}>
            {children.map((child) => (
              <TargetDocumentNode
                nodeData={child}
                key={child.id}
                expandAll={expandAll}
                initialExpandedRank={initialExpandedRank}
                rank={rank + 1}
              />
            ))}
          </div>
        )}
      </NodeContainer>
    </div>
  );
};
