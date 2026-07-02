import './Variables.scss';

import { Label } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { FieldItem, MappingTree, VariableItem } from '../../../models/datamapper/mapping';
import { SourceVariableNodeData, VARIABLES_DOCUMENT_ID } from '../../../models/datamapper/visualization';
import { MappingService } from '../../../services/mapping/mapping.service';
import { ConfirmActionButton } from '../actions/ConfirmActionButton';
import { RenameButton } from '../actions/RenameButton';
import { NodeContainer } from '../NodeContainer';
import { BaseNode } from '../Nodes/BaseNode';
import { VariableInputPlaceholder } from './VariableInputPlaceholder';

type VariableRowProps = {
  variable: VariableItem;
  isRenaming: boolean;
  isReadOnly: boolean;
  onStartRename: (id: string) => void;
  onStopRename: () => void;
  onDelete: (variable: VariableItem) => void;
};

export const VariableRow: FunctionComponent<VariableRowProps> = ({
  variable,
  isRenaming,
  isReadOnly,
  onStartRename,
  onStopRename,
  onDelete,
}) => {
  const { refreshMappingTree } = useDataMapper();
  const nodeData = new SourceVariableNodeData(variable);

  const handleRenameConfirm = useCallback(
    (newName: string) => {
      MappingService.renameVariableReferences(variable, newName);
      MappingService.updateVariable(variable, newName, variable.expression);
      refreshMappingTree();
      onStopRename();
    },
    [variable, refreshMappingTree, onStopRename],
  );

  if (isRenaming) {
    return (
      <VariableInputPlaceholder
        initialName={variable.name}
        parent={variable.parent}
        onConfirm={handleRenameConfirm}
        onCancel={onStopRename}
      />
    );
  }

  const scopeLabel = (() => {
    const p = variable.parent;
    if (p instanceof MappingTree) return undefined;
    if (p instanceof FieldItem) return p.field.displayName;
    return p.name;
  })();

  const variableTitle = (
    <span className="node__spacer variable-row-title">
      <Label>$</Label> {variable.name}
      {scopeLabel && (
        <span className="variable-row-scope-hint" title={`Defined inside "${scopeLabel}"`}>
          &nbsp;({scopeLabel})
        </span>
      )}
    </span>
  );

  const actions = !isReadOnly && (
    <span className="variable-row-actions">
      <RenameButton
        itemName={`variable-${variable.name}`}
        label="variable"
        onRenameClick={() => {
          onStartRename(variable.id);
        }}
      />
      <ConfirmActionButton
        icon={<TrashIcon />}
        title={`Delete variable $${variable.name}`}
        triggerTestId={`delete-variable-${variable.name}-button`}
        modalTestId={`delete-variable-${variable.name}-modal`}
        confirmTestId={`delete-variable-${variable.name}-modal-confirm-btn`}
        cancelTestId={`delete-variable-${variable.name}-modal-cancel-btn`}
        modalTitle="Delete variable"
        description={`Delete variable "$${variable.name}"? Mappings referencing it will also be removed.`}
        onConfirm={() => {
          onDelete(variable);
        }}
      />
    </span>
  );

  return (
    <div className="node__container" data-testid={`variable-row-${variable.name}`}>
      <NodeContainer nodeData={nodeData}>
        <div className="node__header">
          <BaseNode
            nodeData={nodeData}
            title={variableTitle}
            rank={0}
            nodePath={nodeData.path.toString()}
            documentId={VARIABLES_DOCUMENT_ID}
          >
            {actions}
          </BaseNode>
        </div>
      </NodeContainer>
    </div>
  );
};
