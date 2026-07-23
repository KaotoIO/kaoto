import './Variables.scss';

import { Label } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, KeyboardEvent, MouseEvent, useCallback } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { FieldItem, MappingItem, VariableItem } from '../../../models/datamapper/mapping';
import { SourceVariableNodeData, VARIABLES_DOCUMENT_ID } from '../../../models/datamapper/visualization';
import { MappingService } from '../../../services/mapping/mapping.service';
import { ConfirmActionButton } from '../actions/ConfirmActionButton';
import { FieldContextMenu, MenuGroup } from '../actions/FieldContextMenu';
import { useContextMenuState } from '../actions/FieldContextMenu/useContextMenuState';
import { XPathEditorAction } from '../actions/XPathEditorAction';
import { XPathInputAction } from '../actions/XPathInputAction';
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
  const { isMenuOpen, menuPosition, menuRef, closeMenu, openMenu } = useContextMenuState();

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      if (isReadOnly) return;
      openMenu(event);
    },
    [isReadOnly, openMenu],
  );

  const handleDoubleClick = useCallback(() => {
    if (isReadOnly) return;
    onStartRename(variable.id);
  }, [isReadOnly, onStartRename, variable.id]);

  const handleTitleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (isReadOnly) return;
      if (event.key === 'F2' || event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        onStartRename(variable.id);
      }
    },
    [isReadOnly, onStartRename, variable.id],
  );

  const contextMenuGroups: MenuGroup[] = [
    {
      actions: [
        {
          label: 'Rename',
          onClick: () => {
            onStartRename(variable.id);
          },
          testId: `rename-variable-${variable.name}`,
        },
      ],
    },
  ];

  const handleRenameConfirm = useCallback(
    (newName: string) => {
      MappingService.renameVariableReferences(variable, newName);
      MappingService.updateVariable(variable, newName, variable.expression);
      refreshMappingTree();
      onStopRename();
    },
    [variable, refreshMappingTree, onStopRename],
  );

  const handleExpressionUpdate = useCallback(() => {
    if (variable.rawElement && variable.expression) {
      variable.rawElement = undefined;
    }
    refreshMappingTree();
  }, [variable, refreshMappingTree]);

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
    if (variable.scope === 'stylesheet') return 'stylesheet';
    if (variable.scope === 'template') return undefined;
    const p = variable.parent;
    if (p instanceof FieldItem) return p.field.displayName;
    if (p instanceof MappingItem) return p.name;
    return undefined;
  })();

  const isGlobal = variable.scope !== 'node';

  const variableTitle = (
    <span
      className="node__spacer variable-row-title"
      tabIndex={0}
      role="button"
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleTitleKeyDown}
    >
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
    <>
      <div className="node__container" data-testid={`variable-row-${variable.name}`} onContextMenu={handleContextMenu}>
        <NodeContainer nodeData={nodeData}>
          <div className="node__header">
            <BaseNode
              nodeData={nodeData}
              title={variableTitle}
              rank={0}
              nodePath={nodeData.path.toString()}
              documentId={VARIABLES_DOCUMENT_ID}
            >
              {isGlobal && (
                <>
                  <XPathInputAction nodeData={nodeData} mapping={variable} onUpdate={handleExpressionUpdate} />
                  <XPathEditorAction nodeData={nodeData} mapping={variable} onUpdate={handleExpressionUpdate} />
                </>
              )}
              {actions}
            </BaseNode>
          </div>
        </NodeContainer>
      </div>

      {isMenuOpen && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: menuPosition.x,
            top: menuPosition.y,
            zIndex: 1000,
          }}
        >
          <FieldContextMenu groups={contextMenuGroups} onClose={closeMenu} />
        </div>
      )}
    </>
  );
};
