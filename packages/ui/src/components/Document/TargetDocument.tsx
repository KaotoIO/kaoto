import { IDocument } from '../../models/datamapper/document';
import { FunctionComponent, useCallback, useRef, useState } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { MappingNodeData, TargetDocumentNodeData, TargetNodeData } from '../../models/datamapper/visualization';
import { TargetNodeActions } from './actions/TargetNodeActions';
import { NodeContainer } from './NodeContainer';
import { Label, Split, SplitItem, Title, Truncate } from '@patternfly/react-core';
import { NodeReference } from '../../providers/datamapper-canvas.provider';
import { useCanvas } from '../../hooks/useCanvas';
import { VisualizationService } from '../../services/visualization.service';
import { AngleDownIcon, AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import { DocumentActions } from './actions/DocumentActions';
import './Document.scss';

type DocumentProps = {
  document: IDocument;
};

export const TargetDocument: FunctionComponent<DocumentProps> = ({ document }) => {
  const { mappingTree } = useDataMapper();
  const nodeData = new TargetDocumentNodeData(document, mappingTree);

  return <TargetDocumentNode nodeData={nodeData} />;
};

type DocumentNodeProps = {
  nodeData: TargetNodeData;
};

const TargetDocumentNode: FunctionComponent<DocumentNodeProps> = ({ nodeData }) => {
  const { getNodeReference, reloadNodeReferences, setNodeReference } = useCanvas();
  const [collapsed, setCollapsed] = useState(false);

  const onClick = useCallback(() => {
    setCollapsed(!collapsed);
    reloadNodeReferences();
  }, [collapsed, reloadNodeReferences]);

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const isPrimitive = VisualizationService.isPrimitiveDocumentNode(nodeData);
  const children = VisualizationService.generateNodeDataChildren(nodeData) as TargetNodeData[];
  const hasChildren = children.length > 0;
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
        <Truncate content={nodeData.title ?? ''} />
      </Label>
    ) : isDocument ? (
      <Title headingLevel="h5">
        <Truncate content={nodeData.title ?? ''} />
      </Title>
    ) : (
      <Truncate content={nodeData.title ?? ''} />
    );

  return (
    <div
      data-testid={`node-target-${nodeData.id}`}
      className={isDocument ? 'node-container__document' : 'node-container'}
    >
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div
          className={isDocument ? 'node-header__document' : 'node-header'}
          onClick={hasChildren ? onClick : undefined}
        >
          <NodeContainer ref={headerRef} nodeData={nodeData}>
            <Split hasGutter>
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
              <SplitItem>
                {showNodeActions && <TargetNodeActions nodeData={nodeData} onUpdate={handleUpdate} />}
              </SplitItem>
              <SplitItem>{isDocument && <DocumentActions nodeData={nodeData as TargetDocumentNodeData} />}</SplitItem>
            </Split>
          </NodeContainer>
        </div>
        {hasChildren && !collapsed && (
          <div className={isDocument ? 'node-children__document' : 'node-children'}>
            {children.map((child) => (
              <TargetDocumentNode nodeData={child} key={child.id} />
            ))}
          </div>
        )}
      </NodeContainer>
    </div>
  );
};
