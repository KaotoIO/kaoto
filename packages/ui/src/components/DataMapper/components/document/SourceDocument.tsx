import { DocumentNodeData, FieldNodeData, MappingNodeData, NodeData } from '../../models/visualization';
import { FunctionComponent, useRef, useState } from 'react';
import { IDocument } from '../../models/document';
import { Label, Split, SplitItem, Title } from '@patternfly/react-core';
import { DocumentActions } from './actions/DocumentActions';
import { AngleDownIcon, AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import { NodeContainer } from './NodeContainer';
import { NodeReference } from '../../providers/CanvasProvider';
import { useCanvas } from '../../hooks/useCanvas';
import { VisualizationService } from '../../services/visualization.service';
import './Document.scss';

type DocumentProps = {
  document: IDocument;
};

export const SourceDocument: FunctionComponent<DocumentProps> = ({ document }) => {
  const nodeData = new DocumentNodeData(document);
  return <SourceDocumentNode nodeData={nodeData} />;
};

type DocumentNodeProps = {
  nodeData: NodeData;
};

export const SourceDocumentNode: FunctionComponent<DocumentNodeProps> = ({ nodeData }) => {
  const [collapsed, setCollapsed] = useState(false);
  const onClick = () => {
    setCollapsed(!collapsed);
  };

  const isDocument = nodeData instanceof DocumentNodeData;
  const children = VisualizationService.generateNodeDataChildren(nodeData);
  const hasChildren = children.length > 0;
  const isCollectionField = nodeData instanceof FieldNodeData && nodeData.field.maxOccurs > 1;
  const isAttributeField = nodeData instanceof FieldNodeData && nodeData.field?.isAttribute;

  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getNodeReference, setNodeReference } = useCanvas();
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
      <Label>{nodeData.title}</Label>
    ) : isDocument ? (
      <Title headingLevel="h5">{nodeData.title}</Title>
    ) : (
      nodeData.title
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
              <SplitItem>{isDocument && <DocumentActions nodeData={nodeData} />}</SplitItem>
            </Split>
          </div>
        </NodeContainer>
        {hasChildren && !collapsed && (
          <div className={isDocument ? 'node-children__document' : 'node-children'}>
            {children.map((child) => (
              <SourceDocumentNode nodeData={child} key={child.id} />
            ))}
          </div>
        )}
      </div>
    </NodeContainer>
  );
};
