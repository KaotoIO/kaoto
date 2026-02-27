import './BaseDocument.scss';
import './Parameters.scss';

import { ActionList, ActionListItem, Button, Divider, Icon } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon, EyeIcon, EyeSlashIcon, PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { useDataMapper } from '../../hooks/useDataMapper';
import { useDocumentScroll } from '../../hooks/useDocumentScroll.hook';
import { DocumentType, IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { flattenTreeNodes } from '../../utils/flatten-tree-nodes';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
import {
  PANEL_COLLAPSED_HEIGHT,
  PANEL_DEFAULT_HEIGHT,
  PANEL_INPUT_HEIGHT,
  PANEL_INPUT_MIN_HEIGHT,
  PANEL_MIN_HEIGHT,
  VIRTUOSO_OVERSCAN,
} from '../ExpansionPanels/panel-dimensions';
import { DeleteParameterButton } from './actions/DeleteParameterButton';
import { RenameParameterButton } from './actions/RenameParameterButton';
import { DocumentHeader } from './BaseDocument';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';
import { SourceDocumentNode } from './SourceDocumentNode';

type ParametersSectionProps = {
  isReadOnly: boolean;
  onLayoutChange?: () => void;
  actionItems?: React.ReactNode[];
};

type ParametersHeaderProps = {
  isReadOnly: boolean;
  onAddParameter: () => void;
  showParameters: boolean;
  onToggleParameters: () => void;
  actionItems?: React.ReactNode[];
};

/**
 * ParametersHeader - Simple header for the Parameters section
 * Shows "Parameters" title + Add/Eye buttons (when not readonly) + custom action items
 */
export const ParametersHeader: FunctionComponent<ParametersHeaderProps> = ({
  isReadOnly,
  onAddParameter,
  showParameters,
  onToggleParameters,
  actionItems,
}) => (
  <div className="parameters-header" data-testid="source-parameters-header">
    <span className="parameters-header__title panel-header-text">Parameters</span>
    <ActionList isIconList className="parameters-header__actions">
      {!isReadOnly && (
        <>
          <ActionListItem>
            <Button
              icon={<PlusIcon />}
              variant="plain"
              title="Add parameter"
              aria-label="Add parameter"
              data-testid="add-parameter-button"
              onClick={(e) => {
                e.stopPropagation();
                onAddParameter();
              }}
            />
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="plain"
              title={showParameters ? 'Hide all parameters' : 'Show all parameters'}
              aria-label={showParameters ? 'Hide all parameters' : 'Show all parameters'}
              data-testid="toggle-parameters-button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleParameters();
              }}
              icon={<Icon isInline>{showParameters ? <EyeIcon /> : <EyeSlashIcon />}</Icon>}
            />
          </ActionListItem>
          <Divider orientation={{ default: 'vertical' }} />
        </>
      )}
      {actionItems?.map((item, index) => (
        <ActionListItem key={index}>{item}</ActionListItem>
      ))}
    </ActionList>
  </div>
);

type ParameterPanelProps = {
  documentId: string;
  document: IDocument;
  isReadOnly: boolean;
  renamingParameter: string | null;
  onStartRename: (name: string) => void;
  onStopRename: () => void;
  onLayoutChange?: () => void;
};

/**
 * ParameterPanel - renders a single parameter as an ExpansionPanel
 * Extracted to a separate component to satisfy React's rules of hooks
 */
const ParameterPanel: FunctionComponent<ParameterPanelProps> = ({
  documentId,
  document,
  isReadOnly,
  renamingParameter,
  onStartRename,
  onStopRename,
  onLayoutChange,
}) => {
  const { mappingTree } = useDataMapper();
  const parameterNodeData = useMemo(() => new DocumentNodeData(document), [document]);
  const [parameterTree, setParameterTree] = useState<DocumentTree | undefined>(undefined);

  useEffect(() => {
    setParameterTree(TreeUIService.createTree(parameterNodeData));
  }, [parameterNodeData]);

  // Optimize: Select only the expansion state for this document
  const documentExpansionState = useDocumentTreeStore((state) => state.expansionState[parameterNodeData.id] || {});
  const onScroll = useDocumentScroll(parameterNodeData.id);

  // Flatten tree based on expansion state
  const flattenedNodes = useMemo(() => {
    if (!parameterTree) return [];
    return flattenTreeNodes(parameterTree.root, (path) => documentExpansionState[path] ?? false);
  }, [parameterTree, documentExpansionState]);

  const hasSchema = !parameterNodeData.isPrimitive;
  const [isExpanded, setIsExpanded] = useState(hasSchema);
  const parameterName = document.documentId;
  const isRenaming = renamingParameter === parameterName;
  const documentReferenceId = document.getReferenceId(mappingTree.namespaceMap);

  // Track hasSchema changes to trigger mapping line updates when schema is attached/detached
  const prevHasSchemaRef = useRef(hasSchema);
  const onLayoutChangeRef = useRef(onLayoutChange);
  onLayoutChangeRef.current = onLayoutChange;

  useEffect(() => {
    // Only trigger layout change if hasSchema actually changed (not on initial mount)
    if (prevHasSchemaRef.current !== hasSchema) {
      prevHasSchemaRef.current = hasSchema;
      // Wait for ExpansionPanel CSS grid animation (150ms) + child node mounting
      // This ensures mapping lines are recalculated after the panel is fully expanded
      setTimeout(() => {
        onLayoutChangeRef.current?.();
      }, 200);
    }
  }, [hasSchema]);

  const parameterActions = useMemo(
    () => [
      <RenameParameterButton
        key="rename"
        parameterName={parameterName}
        onRenameClick={() => onStartRename(parameterName)}
      />,
      <DeleteParameterButton key="delete" parameterName={parameterName} parameterReferenceId={documentReferenceId} />,
    ],
    [parameterName, documentReferenceId, onStartRename],
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
      onLayoutChange={onScroll}
      onExpandedChange={setIsExpanded}
    >
      {/* Only render children if parameter has schema */}
      {hasSchema && parameterTree && (
        <Virtuoso
          totalCount={flattenedNodes.length}
          itemContent={(index) => {
            const flattenedNode = flattenedNodes[index];
            return (
              <SourceDocumentNode
                key={flattenedNode.path}
                treeNode={flattenedNode.treeNode}
                documentId={parameterNodeData.id}
                isReadOnly={isReadOnly}
                rank={flattenedNode.depth + 1}
              />
            );
          }}
          overscan={VIRTUOSO_OVERSCAN}
        />
      )}
    </ExpansionPanel>
  );
};

/**
 * ParametersSection - Self-contained component that manages all parameter-related state and rendering
 * Returns a fragment of ExpansionPanels (header + new parameter input + individual parameters)
 *
 * This component encapsulates all parameter logic similar to the old Card-based Parameters component,
 * but now works with the new ExpansionPanel architecture.
 */
export const ParametersSection: FunctionComponent<ParametersSectionProps> = ({
  isReadOnly,
  onLayoutChange,
  actionItems,
}) => {
  const { sourceParameterMap } = useDataMapper();

  // State for adding new parameter
  const [isAddingParameter, setIsAddingParameter] = useState(false);

  // State for renaming parameter (track which parameter is being renamed)
  const [renamingParameter, setRenamingParameter] = useState<string | null>(null);

  // State for showing/hiding all parameters
  const [showParameters, setShowParameters] = useState(true);

  // Handlers for parameter operations
  const handleAddParameter = useCallback(() => {
    setIsAddingParameter(true);
    // Auto-show parameters when adding a new one
    setShowParameters(true);
  }, []);

  const handleCompleteAddParameter = useCallback(() => {
    setIsAddingParameter(false);
  }, []);

  const handleStartRename = useCallback((parameterName: string) => {
    setRenamingParameter(parameterName);
  }, []);

  const handleStopRename = useCallback(() => {
    setRenamingParameter(null);
  }, []);

  const handleToggleParameters = useCallback(() => {
    setShowParameters((prev) => !prev);
    // Trigger layout change to update mapping lines when parameters are hidden/shown
    if (onLayoutChange) {
      // Use setTimeout to ensure state has updated before triggering layout change
      setTimeout(() => onLayoutChange(), 0);
    }
  }, [onLayoutChange]);

  return (
    <>
      {/* Parameters section header - NOT expandable, no children */}
      <ExpansionPanel
        id="parameters-header"
        summary={
          <ParametersHeader
            isReadOnly={isReadOnly}
            onAddParameter={handleAddParameter}
            showParameters={showParameters}
            onToggleParameters={handleToggleParameters}
            actionItems={actionItems}
          />
        }
        defaultExpanded={false}
        defaultHeight={PANEL_COLLAPSED_HEIGHT}
        minHeight={PANEL_MIN_HEIGHT}
        onLayoutChange={onLayoutChange}
      >
        {/* NO CHILDREN - header only panel */}
      </ExpansionPanel>

      {/* Only render parameters if showParameters is true */}
      {showParameters && (
        <>
          {/* New parameter input - temporary panel when adding */}
          {isAddingParameter && (
            <ExpansionPanel
              id="new-parameter-input"
              summary={<ParameterInputPlaceholder onComplete={handleCompleteAddParameter} />}
              defaultExpanded={false}
              defaultHeight={PANEL_INPUT_HEIGHT} // Fixed height to accommodate input + error messages
              minHeight={PANEL_INPUT_MIN_HEIGHT}
              onLayoutChange={onLayoutChange}
            >
              {/* NO CHILDREN - input only */}
            </ExpansionPanel>
          )}

          {/* Each existing parameter - composed directly */}
          {Array.from(sourceParameterMap.entries()).map(([documentId, doc]) => (
            <ParameterPanel
              key={documentId}
              documentId={documentId}
              document={doc}
              isReadOnly={isReadOnly}
              renamingParameter={renamingParameter}
              onStartRename={handleStartRename}
              onStopRename={handleStopRename}
              onLayoutChange={onLayoutChange}
            />
          ))}
        </>
      )}
    </>
  );
};
