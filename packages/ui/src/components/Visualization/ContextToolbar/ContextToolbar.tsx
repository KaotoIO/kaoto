import { Button, Toolbar, ToolbarContent, ToolbarItem, Tooltip } from '@patternfly/react-core';
import { UndoIcon, RedoIcon } from '@patternfly/react-icons';
import { FunctionComponent, JSX, useContext } from 'react';
import { sourceSchemaConfig } from '../../../models/camel';
import { EntitiesContext } from '../../../providers/entities.provider';
import './ContextToolbar.scss';
import { FlowClipboard } from './FlowClipboard/FlowClipboard';
import { ExportDocument } from './ExportDocument/ExportDocument';
import { FlowExportImage } from './FlowExportImage/FlowExportImage';
import { FlowsMenu } from './Flows/FlowsMenu';
import { NewEntity } from './NewEntity/NewEntity';
import { RuntimeSelector } from './RuntimeSelector/RuntimeSelector';
import { useEditorCommands } from '../../../multiplying-architecture/Bridge/EditorCommandsContext';

export const ContextToolbar: FunctionComponent<{ additionalControls?: JSX.Element[] }> = ({ additionalControls }) => {
  const { currentSchemaType } = useContext(EntitiesContext)!;
  const isMultipleRoutes = sourceSchemaConfig.config[currentSchemaType].multipleRoute;
  const editorCommands = useEditorCommands();

  const toolbarItems: JSX.Element[] = [
    <ToolbarItem key="toolbar-flows-list">
      <FlowsMenu />
    </ToolbarItem>,
  ];

  if (isMultipleRoutes) {
    toolbarItems.push(
      <ToolbarItem key="toolbar-new-route">
        <NewEntity />
      </ToolbarItem>,
    );
  }
  //Currently adding only SerializerSelector at the beginning of the toolbar,
  if (additionalControls) {
    additionalControls.forEach((control) => toolbarItems.unshift(control));
  }

  return (
    <Toolbar className="context-toolbar">
      <ToolbarContent>
        {toolbarItems.concat([
          <ToolbarItem key="toolbar-undo">
            <Tooltip content="Undo">
              <Button
                aria-label="Undo"
                variant="plain"
                isDisabled={editorCommands.canUndo ? !editorCommands.canUndo() : false}
                onClick={() => editorCommands.undo()}
              >
                <UndoIcon />
              </Button>
            </Tooltip>
          </ToolbarItem>,
          <ToolbarItem key="toolbar-redo">
            <Tooltip content="Redo">
              <Button
                aria-label="Redo"
                variant="plain"
                isDisabled={editorCommands.canRedo ? !editorCommands.canRedo() : false}
                onClick={() => editorCommands.redo()}
              >
                <RedoIcon />
              </Button>
            </Tooltip>
          </ToolbarItem>,
          <ToolbarItem key="toolbar-clipboard">
            <FlowClipboard />
          </ToolbarItem>,
          <ToolbarItem key="toolbar-export-image">
            <FlowExportImage />
          </ToolbarItem>,
          <ToolbarItem key="toolbar-export-document">
            <ExportDocument />
          </ToolbarItem>,

          <RuntimeSelector key="runtime-selector" />,
        ])}
      </ToolbarContent>
    </Toolbar>
  );
};
