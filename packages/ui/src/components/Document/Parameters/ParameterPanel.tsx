import { Icon } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { useConnectionPortSync } from '../../../hooks/useConnectionPortSync.hook';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { DocumentType, IDocument } from '../../../models/datamapper/document';
import { DocumentNodeData } from '../../../models/datamapper/visualization';
import { TreeUIService } from '../../../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../../../store/document-tree.store';
import { ExpansionPanel } from '../../ExpansionPanels/ExpansionPanel';
import {
  PANEL_COLLAPSED_HEIGHT,
  PANEL_DEFAULT_HEIGHT,
  PANEL_MIN_HEIGHT,
  VIRTUOSO_OVERSCAN,
} from '../../ExpansionPanels/panel-dimensions';
import { RenameButton } from '../actions/RenameButton';
import { DocumentHeader } from '../BaseDocument';
import { EdgeMarkerPort } from '../EdgeMarkerPort';
import { SourceDocumentNodeWithContextMenu } from '../SourceDocumentNode';
import { DeleteParameterButton } from './DeleteParameterButton';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';

type ParameterPanelProps = {
  documentId: string;
  document: IDocument;
  isReadOnly: boolean;
  renamingParameter: string | null;
  onStartRename: (name: string) => void;
  onStopRename: () => void;
};

/**
 * ParameterPanel - renders a single parameter as an ExpansionPanel
 * Extracted to a separate component to satisfy React's rules of hooks
 */
export const ParameterPanel: FunctionComponent<ParameterPanelProps> = ({
  documentId,
  document,
  isReadOnly,
  renamingParameter,
  onStartRename,
  onStopRename,
}) => {
  const { mappingTree } = useDataMapper();
  const parameterNodeData = useMemo(() => new DocumentNodeData(document), [document]);
  const parameterTree = useSyncExternalStore(
    useDocumentTreeStore.subscribe,
    useCallback(() => TreeUIService.getTree(parameterNodeData.id), [parameterNodeData.id]),
  );

  useEffect(() => {
    TreeUIService.createTree(parameterNodeData);
  }, [parameterNodeData]);

  // Optimize: Select only the expansion state for this document
  const documentExpansionState = useDocumentTreeStore((state) => state.expansionState[parameterNodeData.id] || {});
  const { syncConnectionPorts, virtuosoComponents } = useConnectionPortSync(parameterNodeData.id);

  // Flatten tree based on expansion state
  const flattenedNodes = useMemo(() => {
    if (!parameterTree) return [];
    return parameterTree.flatten(documentExpansionState);
  }, [parameterTree, documentExpansionState]);

  // Recalculate connection ports when flattened nodes change (expand/collapse)
  useEffect(() => {
    syncConnectionPorts();
  }, [flattenedNodes.length, syncConnectionPorts]);

  const hasSchema = !parameterNodeData.isPrimitive;
  const [isExpanded, setIsExpanded] = useState(hasSchema);

  const renderParameterItem = useCallback(
    (index: number) => {
      const flattenedNode = flattenedNodes[index];
      return (
        <SourceDocumentNodeWithContextMenu
          key={flattenedNode.path}
          treeNode={flattenedNode.treeNode}
          documentNodeId={parameterNodeData.id}
          isReadOnly={isReadOnly}
          rank={flattenedNode.depth + 1}
        />
      );
    },
    [flattenedNodes, parameterNodeData.id, isReadOnly],
  );
  const parameterName = document.documentId;
  const isRenaming = renamingParameter === parameterName;
  const documentReferenceId = document.getReferenceId(mappingTree.namespaceMap);

  const edgeMarkers = useMemo(
    () => [
      <EdgeMarkerPort key="edge-top" documentNodeId={parameterNodeData.id} isSource edge="top" />,
      <EdgeMarkerPort key="edge-bottom" documentNodeId={parameterNodeData.id} isSource edge="bottom" />,
    ],
    [parameterNodeData.id],
  );

  const parameterActions = useMemo(
    () => [
      ...edgeMarkers,
      <RenameButton
        key="rename"
        itemName={`parameter-${parameterName}`}
        label="parameter"
        onRenameClick={() => {
          onStartRename(parameterName);
        }}
      />,
      <DeleteParameterButton key="delete" parameterName={parameterName} parameterReferenceId={documentReferenceId} />,
    ],
    [edgeMarkers, parameterName, documentReferenceId, onStartRename],
  );

  return (
    <ExpansionPanel
      id={`parameter-${documentId}`}
      defaultExpanded={hasSchema}
      defaultHeight={hasSchema ? PANEL_DEFAULT_HEIGHT : PANEL_COLLAPSED_HEIGHT}
      minHeight={PANEL_MIN_HEIGHT}
      summary={
        isRenaming ? (
          <ParameterInputPlaceholder parameter={parameterName} onComplete={onStopRename} />
        ) : (
          <div className="parameter-panel__summary">
            {hasSchema && (
              <Icon isInline className="parameter-panel__chevron">
                {isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
              </Icon>
            )}
            <DocumentHeader
              header={<span className="panel-header-text panel-header-text--parameter">{parameterName}</span>}
              document={document}
              documentType={DocumentType.PARAM}
              isReadOnly={isReadOnly}
              additionalActions={parameterActions}
              enableDnD={!hasSchema}
            />
          </div>
        )
      }
      onLayoutChange={syncConnectionPorts}
      onExpandedChange={setIsExpanded}
    >
      {/* Only render children if parameter has schema */}
      {hasSchema && parameterTree && (
        <Virtuoso
          totalCount={flattenedNodes.length}
          components={virtuosoComponents}
          itemContent={renderParameterItem}
          overscan={VIRTUOSO_OVERSCAN}
          totalListHeightChanged={syncConnectionPorts}
        />
      )}
    </ExpansionPanel>
  );
};
