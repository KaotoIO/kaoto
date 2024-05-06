import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { RedoIcon, UndoIcon } from '@patternfly/react-icons';
import { FunctionComponent, JSX, useContext, useMemo } from 'react';
import { useUndoRedo } from '../../../hooks/undo-redo.hook';
import { sourceSchemaConfig } from '../../../models/camel';
import { EntitiesContext } from '../../../providers/entities.provider';
import './ContextToolbar.scss';
import { ExportDocument } from './ExportDocument/ExportDocument';
import { FlowClipboard } from './FlowClipboard/FlowClipboard';
import { FlowExportImage } from './FlowExportImage/FlowExportImage';
import { FlowsMenu } from './Flows/FlowsMenu';
import { NewEntity } from './NewEntity/NewEntity';
import { RuntimeSelector } from './RuntimeSelector/RuntimeSelector';

export const ContextToolbar: FunctionComponent<{ additionalControls?: JSX.Element[] }> = ({ additionalControls }) => {
  const { currentSchemaType } = useContext(EntitiesContext)!;
  const isMultipleRoutes = sourceSchemaConfig.config[currentSchemaType].multipleRoute;
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  const metaKey = useMemo(() => (navigator.userAgent.toLocaleLowerCase().includes('mac') ? '⌘' : 'Ctrl'), []);

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
            <Button
              aria-label="Undo"
              title={`Undo\n${metaKey} + Z`}
              variant="plain"
              isDisabled={!canUndo}
              onClick={undo}
            >
              <UndoIcon />
            </Button>
          </ToolbarItem>,
          <ToolbarItem key="toolbar-redo">
            <Button
              aria-label="Redo"
              title={`Redo\n${metaKey} + Shift + Z`}
              variant="plain"
              isDisabled={!canRedo}
              onClick={redo}
            >
              <RedoIcon />
            </Button>
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
