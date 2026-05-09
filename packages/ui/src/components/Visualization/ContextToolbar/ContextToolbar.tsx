import './ContextToolbar.scss';

import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { RedoIcon, UndoIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { useUndoRedo } from '../../../hooks/undo-redo.hook';
import { useEntityContext } from '../../../hooks/useEntityContext/useEntityContext';
import { sourceSchemaConfig, SourceSchemaType } from '../../../models/camel';
import { ExportDocument } from './ExportDocument/ExportDocument';
import { FlowClipboard } from './FlowClipboard/FlowClipboard';
import { FlowExportImage } from './FlowExportImage/FlowExportImage';
import { FlowsMenu } from './Flows/FlowsMenu';
import { IntegrationTypeSelector } from './IntegrationTypeSelector/IntegrationTypeSelector';
import { NewEntity } from './NewEntity/NewEntity';
import { RuntimeSelector } from './RuntimeSelector/RuntimeSelector';
import { SerializerSelector } from './SerializerSelector/SerializerSelector';

interface ContextToolbarProps {
  isSimplified?: boolean;
}

export const ContextToolbar: FunctionComponent<ContextToolbarProps> = ({ isSimplified }) => {
  const { currentSchemaType } = useEntityContext();
  const doesSupportSerializers = !isSimplified && currentSchemaType === SourceSchemaType.Route;
  const isMultipleRoutes = sourceSchemaConfig.config[currentSchemaType].multipleRoute;
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  return (
    <Toolbar className="context-toolbar">
      <ToolbarContent>
        {doesSupportSerializers && (
          <ToolbarItem key="toolbar-item-serializer-selector">
            <SerializerSelector key="toolbar-serializer-selector" />
          </ToolbarItem>
        )}

        {!isSimplified && (
          <ToolbarItem key="toolbar-dsl-selector">
            <IntegrationTypeSelector />
          </ToolbarItem>
        )}

        <ToolbarItem key="toolbar-flows-list">
          <FlowsMenu />
        </ToolbarItem>

        {isMultipleRoutes && (
          <ToolbarItem key="toolbar-new-route">
            <NewEntity />
          </ToolbarItem>
        )}

        <ToolbarItem key="toolbar-undo">
          <Button aria-label="Undo" title="Undo" variant="plain" isDisabled={!canUndo} onClick={undo}>
            <UndoIcon />
          </Button>
        </ToolbarItem>

        <ToolbarItem key="toolbar-redo">
          <Button aria-label="Redo" title="Redo" variant="plain" isDisabled={!canRedo} onClick={redo}>
            <RedoIcon />
          </Button>
        </ToolbarItem>

        <ToolbarItem key="toolbar-clipboard">
          <FlowClipboard />
        </ToolbarItem>

        <ToolbarItem key="toolbar-export-image">
          <FlowExportImage />
        </ToolbarItem>

        <ToolbarItem key="toolbar-export-document">
          <ExportDocument />
        </ToolbarItem>

        {!isSimplified && <RuntimeSelector key="runtime-selector" />}
      </ToolbarContent>
    </Toolbar>
  );
};
