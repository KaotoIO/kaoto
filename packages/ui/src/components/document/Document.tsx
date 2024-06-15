import { FunctionComponent, useRef, useState } from 'react';
import { AngleDownIcon, AtIcon, GripVerticalIcon, LayerGroupIcon } from '@patternfly/react-icons';
import './Document.scss';
import { DocumentNodeData, FieldNodeData, MappingNodeData, NodeData } from '../../models/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { Label, Split, SplitItem, Title } from '@patternfly/react-core';
import { NodeContainer } from './NodeContainer';
import { PrimitiveDocument } from '../../models/document';
import { NodeReference } from '../../providers/CanvasProvider';
import { useCanvas } from '../../hooks/useCanvas';
import { DocumentActions } from './actions/DocumentActions';

type DocumentNodeProps = {
  nodeData: NodeData;
  nodeActions?: React.ReactNode;
};

export const DocumentNode: FunctionComponent<DocumentNodeProps> = ({ nodeData, nodeActions }) => {
  const [collapsed, setCollapsed] = useState(false);
  const onClick = () => {
    setCollapsed(!collapsed);
  };

  const isDocument = nodeData instanceof DocumentNodeData;
  const isPrimitive = isDocument && nodeData.document instanceof PrimitiveDocument;
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

  const showNodeActions = nodeActions && ((isDocument && isPrimitive) || !isDocument);

  const nodeTitle =
    nodeData instanceof MappingNodeData ? (
      <Label>{nodeData.title}</Label>
    ) : isDocument ? (
      <Title headingLevel="h5">{nodeData.title}</Title>
    ) : (
      nodeData.title
    );

  return (
    <div className={isDocument ? 'node-container__document' : 'node-container'}>
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div
          className={isDocument ? 'node-header__document' : 'node-header'}
          onClick={hasChildren ? onClick : undefined}
        >
          <NodeContainer ref={headerRef} nodeData={nodeData}>
            <Split hasGutter>
              {hasChildren && (
                <SplitItem>
                  <AngleDownIcon className={`${collapsed ? 'toggle-icon-collapsed' : ''}`} />
                </SplitItem>
              )}
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
              <SplitItem>{showNodeActions && nodeActions}</SplitItem>
              <SplitItem>{isDocument && <DocumentActions nodeData={nodeData} />}</SplitItem>
            </Split>
          </NodeContainer>
        </div>
        {hasChildren && !collapsed && (
          <div className={isDocument ? 'node-children__document' : 'node-children'}>
            {children.map((child) => (
              <DocumentNode nodeData={child} key={child.id} />
            ))}
          </div>
        )}
      </NodeContainer>
    </div>
  );
};
