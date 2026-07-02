import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';

import { useConnectionPortSync } from '../../../hooks/useConnectionPortSync.hook';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { VariableItem } from '../../../models/datamapper/mapping';
import { VARIABLES_DOCUMENT_ID } from '../../../models/datamapper/visualization';
import { MappingService } from '../../../services/mapping/mapping.service';
import { ExpansionPanel } from '../../ExpansionPanels/ExpansionPanel';
import { PANEL_COLLAPSED_HEIGHT, PANEL_MIN_HEIGHT } from '../../ExpansionPanels/panel-dimensions';
import { VariableRow } from './VariableRow';
import { VariablesHeader } from './VariablesHeader';

type VariablesSectionProps = {
  isReadOnly: boolean;
  onLayoutChange?: () => void;
};

export const VariablesSection: FunctionComponent<VariablesSectionProps> = ({ isReadOnly, onLayoutChange }) => {
  const { variables, refreshMappingTree } = useDataMapper();
  const { syncConnectionPorts } = useConnectionPortSync(VARIABLES_DOCUMENT_ID);

  const [renamingVariableId, setRenamingVariableId] = useState<string | null>(null);

  useEffect(() => {
    syncConnectionPorts();
  }, [variables.length, syncConnectionPorts]);

  const handleStartRename = useCallback((id: string) => {
    setRenamingVariableId(id);
  }, []);
  const handleStopRename = useCallback(() => {
    setRenamingVariableId(null);
  }, []);

  const handleDelete = useCallback(
    (variable: VariableItem) => {
      MappingService.removeVariableReferences(variable);
      MappingService.removeVariable(variable);
      refreshMappingTree();
    },
    [refreshMappingTree],
  );

  const hasContent = variables.length > 0;

  const edgeMarkers = useMemo(
    () => (
      <>
        <span
          className="expansion-panel__edge-marker expansion-panel__edge-marker--top expansion-panel__edge-marker--source"
          data-connection-port="true"
          data-document-id={VARIABLES_DOCUMENT_ID}
          data-node-path={`${VARIABLES_DOCUMENT_ID}:EDGE:top`}
        />
        <span
          className="expansion-panel__edge-marker expansion-panel__edge-marker--bottom expansion-panel__edge-marker--source"
          data-connection-port="true"
          data-document-id={VARIABLES_DOCUMENT_ID}
          data-node-path={`${VARIABLES_DOCUMENT_ID}:EDGE:bottom`}
        />
      </>
    ),
    [],
  );

  return (
    <ExpansionPanel
      id="variables"
      summary={<VariablesHeader isReadOnly={isReadOnly} />}
      defaultExpanded={hasContent}
      defaultHeight={hasContent ? PANEL_COLLAPSED_HEIGHT + variables.length * 32 : PANEL_COLLAPSED_HEIGHT}
      minHeight={PANEL_MIN_HEIGHT}
      onLayoutChange={() => {
        syncConnectionPorts();
        onLayoutChange?.();
      }}
    >
      {hasContent && (
        <>
          {edgeMarkers}
          {variables.map((variable) => (
            <VariableRow
              key={variable.id}
              variable={variable}
              isRenaming={renamingVariableId === variable.id}
              isReadOnly={isReadOnly}
              onStartRename={handleStartRename}
              onStopRename={handleStopRename}
              onDelete={handleDelete}
            />
          ))}
        </>
      )}
    </ExpansionPanel>
  );
};
