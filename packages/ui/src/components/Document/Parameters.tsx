import './Parameters.scss';
import './BaseDocument.scss';

import { ActionList, ActionListItem, Button, Icon } from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon, EyeIcon, EyeSlashIcon, PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType, IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
import {
  PANEL_COLLAPSED_HEIGHT,
  PANEL_DEFAULT_HEIGHT,
  PANEL_INPUT_HEIGHT,
  PANEL_INPUT_MIN_HEIGHT,
  PANEL_MIN_HEIGHT,
} from '../ExpansionPanels/panel-dimensions';
import { DeleteParameterButton } from './actions/DeleteParameterButton';
import { RenameParameterButton } from './actions/RenameParameterButton';
import { DocumentContent, DocumentHeader } from './BaseDocument';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';
import { SourceDocumentNode } from './SourceDocumentNode';

type ParametersSectionProps = {
  isReadOnly: boolean;
  onScroll: () => void;
  onLayoutChange?: () => void;
};

type ParametersHeaderProps = {
  isReadOnly: boolean;
  onAddParameter: () => void;
  showParameters: boolean;
  onToggleParameters: () => void;
};

/**
 * ParametersHeader - Simple header for the Parameters section
 * Shows "Parameters" title + Add button + Show/Hide toggle
 */
export const ParametersHeader: FunctionComponent<ParametersHeaderProps> = ({
  isReadOnly,
  onAddParameter,
  showParameters,
  onToggleParameters,
}) => {
  const handleAddClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation(); // Prevent panel expansion when clicking add
      onAddParameter();
    },
    [onAddParameter],
  );

  const handleToggleClick = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation(); // Prevent panel expansion when clicking toggle
      onToggleParameters();
    },
    [onToggleParameters],
  );

  return (
    <div className="parameters-header" data-testid="source-parameters-header">
      <span className="parameters-header__title panel-header-text">Parameters</span>
      {!isReadOnly && (
        <ActionList isIconList className="parameters-header__actions">
          <ActionListItem>
            <Button
              icon={<PlusIcon />}
              variant="plain"
              title="Add parameter"
              aria-label="Add parameter"
              data-testid="add-parameter-button"
              onClick={handleAddClick}
            />
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="plain"
              title={showParameters ? 'Hide all parameters' : 'Show all parameters'}
              aria-label={showParameters ? 'Hide all parameters' : 'Show all parameters'}
              data-testid="toggle-parameters-button"
              onClick={handleToggleClick}
              icon={<Icon isInline>{showParameters ? <EyeIcon /> : <EyeSlashIcon />}</Icon>}
            />
          </ActionListItem>
        </ActionList>
      )}
    </div>
  );
};

type ParameterPanelProps = {
  documentId: string;
  document: IDocument;
  isReadOnly: boolean;
  renamingParameter: string | null;
  onStartRename: (name: string) => void;
  onStopRename: () => void;
  onScroll: () => void;
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
  onScroll,
  onLayoutChange,
}) => {
  const { mappingTree } = useDataMapper();
  const parameterNodeData = useMemo(() => new DocumentNodeData(document), [document]);
  const [parameterTree, setParameterTree] = useState<DocumentTree | undefined>(undefined);

  useEffect(() => {
    setParameterTree(TreeUIService.createTree(parameterNodeData));
  }, [parameterNodeData]);

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
      onScroll={onScroll}
      onLayoutChange={onLayoutChange}
      onExpandedChange={setIsExpanded}
    >
      {/* Only render children if parameter has schema */}
      {hasSchema && parameterTree && (
        <DocumentContent
          treeNode={parameterTree.root}
          isReadOnly={isReadOnly}
          renderNodes={(childNode, readOnly) => (
            <SourceDocumentNode
              treeNode={childNode}
              documentId={parameterTree.documentId}
              isReadOnly={readOnly}
              rank={1}
            />
          )}
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
  onScroll,
  onLayoutChange,
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
          />
        }
        defaultExpanded={false}
        defaultHeight={PANEL_COLLAPSED_HEIGHT}
        minHeight={PANEL_MIN_HEIGHT}
        onScroll={onScroll}
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
              onScroll={onScroll}
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
              onScroll={onScroll}
              onLayoutChange={onLayoutChange}
            />
          ))}
        </>
      )}
    </>
  );
};
