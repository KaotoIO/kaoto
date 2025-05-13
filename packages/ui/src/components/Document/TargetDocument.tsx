import { ActionList, ActionListGroup, ActionListItem, Button, Icon } from '@patternfly/react-core';
import {
  AngleDownIcon,
  AtIcon,
  GripVerticalIcon,
  LayerGroupIcon,
  PlusCircleIcon,
  PlusIcon,
} from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, MouseEvent, useCallback, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { IDocument } from '../../models/datamapper/document';
import {
  AddMappingNodeData,
  NodeReference,
  TargetDocumentNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { VisualizationService } from '../../services/visualization.service';
import { DocumentActions } from './actions/DocumentActions';
import { TargetNodeActions } from './actions/TargetNodeActions';
import './Document.scss';
import { NodeContainer } from './NodeContainer';
import { NodeTitle } from './NodeTitle';
import { ConditionMenuAction } from './actions/ConditionMenuAction';
import { useMappingLinks } from '../../hooks/useMappingLinks';

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
                <Icon className="node__spacer" onClick={handleClickToggle}>
                  <AngleDownIcon
                    data-testid={`expand-target-icon-${nodeData.title}`}
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

              <NodeTitle className="node__spacer" nodeData={nodeData} isDocument={isDocument} />

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
            {children.map((child) =>
              child instanceof AddMappingNodeData ? (
                <AddMappingNode nodeData={child} key={child.id}></AddMappingNode>
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

const AddMappingNode: FunctionComponent<{ nodeData: AddMappingNodeData }> = ({ nodeData }) => {
  const { refreshMappingTree } = useDataMapper();
  const { getNodeReference, setNodeReference } = useCanvas();

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

  const handleAddMapping = useCallback(() => {
    VisualizationService.addMapping(nodeData);
    refreshMappingTree();
  }, [nodeData, refreshMappingTree]);

  return (
    <div data-testid={`node-target-${nodeData.id}`} className={clsx({ node__container: true })}>
      <NodeContainer ref={containerRef} nodeData={nodeData}>
        <div className={clsx({ node__add__mapping__header: true })}>
          <NodeContainer ref={headerRef} nodeData={nodeData}>
            <section className="node__row" data-draggable={false}>
              <span className="node__row">
                <Icon className="node__spacer">
                  <PlusIcon className="node__add__mapping__icon" />
                </Icon>
                <Icon className="node__spacer">
                  <LayerGroupIcon className="node__add__mapping__icon" />
                </Icon>
                <NodeTitle className="node__spacer node__add__mapping__text" nodeData={nodeData} isDocument={false} />
              </span>

              <ActionList>
                <ActionListGroup className="node__add__mapping__actions">
                  <ActionListItem>
                    <Button icon={<PlusCircleIcon />} variant="tertiary" onClick={handleAddMapping}>
                      Add Mapping
                    </Button>
                  </ActionListItem>
                  <ConditionMenuAction
                    nodeData={nodeData}
                    dropdownLabel="Add Conditional Mapping"
                    onUpdate={refreshMappingTree}
                  />
                </ActionListGroup>
              </ActionList>
            </section>
          </NodeContainer>
        </div>
      </NodeContainer>
    </div>
  );
};
