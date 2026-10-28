import '../BaseDocument.scss';
import './Parameters.scss';

import { FunctionComponent, useCallback, useEffect, useState } from 'react';

import { useConnectionPortSync } from '../../../hooks/useConnectionPortSync.hook';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { PARAMETERS_SECTION_ANCHOR } from '../../../models/datamapper/connection-port';
import { ExpansionPanel } from '../../ExpansionPanels/ExpansionPanel';
import {
  PANEL_COLLAPSED_HEIGHT,
  PANEL_INPUT_HEIGHT,
  PANEL_INPUT_MIN_HEIGHT,
  PANEL_MIN_HEIGHT,
} from '../../ExpansionPanels/panel-dimensions';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';
import { ParameterPanel } from './ParameterPanel';
import { ParametersHeader } from './ParametersHeader';

type ParametersSectionProps = {
  isReadOnly: boolean;
  onLayoutChange?: () => void;
};

/**
 * ParametersSection - Self-contained component that manages all parameter-related state and rendering
 * Returns a fragment of ExpansionPanels (header + new parameter input + individual parameters)
 *
 * This component encapsulates all parameter logic similar to the old Card-based Parameters component,
 * but now works with the new ExpansionPanel architecture.
 */
export const ParametersSection: FunctionComponent<ParametersSectionProps> = ({ isReadOnly, onLayoutChange }) => {
  const { sourceParameterMap } = useDataMapper();
  const { syncConnectionPorts } = useConnectionPortSync(PARAMETERS_SECTION_ANCHOR.documentNodeId);

  // State for adding new parameter
  const [isAddingParameter, setIsAddingParameter] = useState(false);

  // State for renaming parameter (track which parameter is being renamed)
  const [renamingParameter, setRenamingParameter] = useState<string | null>(null);

  // State for showing/hiding all parameters
  const [showParameters, setShowParameters] = useState(true);

  useEffect(() => {
    syncConnectionPorts();
  }, [syncConnectionPorts]);

  // Handlers for parameter operations
  const handleAddParameter = useCallback(() => {
    setIsAddingParameter(true);
    // Auto-show parameters when adding a new one
    setShowParameters(true);
    syncConnectionPorts();
  }, [syncConnectionPorts]);

  const handleCompleteAddParameter = useCallback(() => {
    setIsAddingParameter(false);
    syncConnectionPorts();
  }, [syncConnectionPorts]);

  const handleStartRename = useCallback((parameterName: string) => {
    setRenamingParameter(parameterName);
  }, []);

  const handleStopRename = useCallback(() => {
    setRenamingParameter(null);
  }, []);

  const handleToggleParameters = useCallback(() => {
    setShowParameters((prev) => !prev);
    syncConnectionPorts();
    // Trigger layout change to update mapping lines when parameters are hidden/shown
    if (onLayoutChange) {
      // Use setTimeout to ensure state has updated before triggering layout change
      setTimeout(() => {
        onLayoutChange();
      }, 0);
    }
  }, [onLayoutChange, syncConnectionPorts]);

  const handleHeaderLayoutChange = useCallback(() => {
    syncConnectionPorts();
    onLayoutChange?.();
  }, [syncConnectionPorts, onLayoutChange]);

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
        onLayoutChange={handleHeaderLayoutChange}
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
            />
          ))}
        </>
      )}
    </>
  );
};
