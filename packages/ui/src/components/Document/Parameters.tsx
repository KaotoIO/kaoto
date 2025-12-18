import './Parameters.scss';
import './BaseDocument.scss';

import { ActionList, ActionListItem, Button, Icon, Title } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentType, IDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
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
    <div className="parameters-header">
      <Title headingLevel="h5" className="parameters-header__title">
        Parameters
      </Title>
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
  const parameterName = document.documentId;
  const isRenaming = renamingParameter === parameterName;
  const documentReferenceId = document.getReferenceId(mappingTree.namespaceMap);

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
      defaultHeight={hasSchema ? 300 : 40}
      minHeight={40}
      summary={
        isRenaming ? (
          <ParameterInputPlaceholder parameter={parameterName} onComplete={onStopRename} />
        ) : (
          <DocumentHeader
            header={<Title headingLevel="h5">{parameterName}</Title>}
            document={document}
            documentType={DocumentType.PARAM}
            isReadOnly={isReadOnly}
            additionalActions={parameterActions}
            enableDnD={!hasSchema}
          />
        )
      }
      onScroll={onScroll}
      onLayoutChange={onLayoutChange}
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
        defaultHeight={40}
        minHeight={40}
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
              defaultHeight={230} // Fixed height to accommodate input + error messages
              minHeight={140}
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
