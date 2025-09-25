import { At, ChevronDown, ChevronRight, Draggable } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, useCallback, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import {
  AddMappingNodeData,
  NodeReference,
  TargetDocumentNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { DocumentActions } from './actions/DocumentActions';
import { TargetNodeActions } from './actions/TargetNodeActions';
import { AddMappingNode } from './AddMappingNode';
import './Document.scss';
import { FieldIcon } from './FieldIcon';
import { NodeContainer } from './NodeContainer';
import { NodeTitle } from './NodeTitle';

type DocumentNodeProps = {
  nodeData: TargetNodeData;
  expandAll: boolean;
  initialExpandedRank: number;
  rank: number;
};

export const TargetDocumentNode: FunctionComponent<DocumentNodeProps> = ({
  nodeData,
  expandAll,
  initialExpandedRank,
  rank,
}) => {
  const { getNodeReference, reloadNodeReferences, setNodeReference } = useCanvas();
  const { isInSelectedMapping, toggleSelectedNodeReference } = useMappingLinks();

  const shouldCollapseByDefault =
    !expandAll && VisualizationService.shouldCollapseByDefault(nodeData, initialExpandedRank, rank);
  const [collapsed, setCollapsed] = useState(shouldCollapseByDefault);

  const isDocument = VisualizationService.isDocumentNode(nodeData);
  const isPrimitive = VisualizationService.isPrimitiveDocumentNode(nodeData);
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

  const children = VisualizationService.generateNodeDataChildren(nodeData) as TargetNodeData[];
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
                  {!collapsed && <ChevronDown data-testid={`expand-target-icon-${nodeData.title}`} />}
                  {collapsed && <ChevronRight data-testid={`collapse-target-icon-${nodeData.title}`} />}
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

              <NodeTitle className="node__spacer" nodeData={nodeData} isDocument={isDocument} />

              {showNodeActions ? (
                <TargetNodeActions className="node__target__actions" nodeData={nodeData} onUpdate={handleUpdate} />
              ) : (
                <span className="node__target__actions" />
              )}

              {isDocument && <DocumentActions nodeData={nodeData as TargetDocumentNodeData} onRenameClick={() => {}} />}
            </section>
          </NodeContainer>
        </div>

        {hasChildren && !collapsed && (
          <div className={clsx({ node__children: !isDocument })}>
            {children.map((child) =>
              child instanceof AddMappingNodeData ? (
                <AddMappingNode nodeData={child} key={child.id} />
              ) : (
                <TargetDocumentNode
                  nodeData={child}
                  key={child.id}
                  expandAll={expandAll}
                  initialExpandedRank={initialExpandedRank}
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
