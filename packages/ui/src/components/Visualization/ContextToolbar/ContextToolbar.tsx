import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { FunctionComponent, JSX, useContext } from 'react';
import { sourceSchemaConfig } from '../../../models/camel';
import { EntitiesContext } from '../../../providers/entities.provider';
import './ContextToolbar.scss';
import { DSLSelector } from './DSLSelector/DSLSelector';
import { FlowClipboard } from './FlowClipboard/FlowClipboard';
import { ExportDocument } from './ExportDocument/ExportDocument';
import { FlowExportImage } from './FlowExportImage/FlowExportImage';
import { FlowsMenu } from './Flows/FlowsMenu';
import { NewEntity } from './NewEntity/NewEntity';
import { RuntimeSelector } from './RuntimeSelector/RuntimeSelector';

export const ContextToolbar: FunctionComponent<{ additionalControls?: JSX.Element[] }> = ({ additionalControls }) => {
  const { currentSchemaType } = useContext(EntitiesContext)!;
  const isMultipleRoutes = sourceSchemaConfig.config[currentSchemaType].multipleRoute;

  const toolbarItems: JSX.Element[] = [
    <ToolbarItem key="toolbar-dsl-selector">
      <DSLSelector />
    </ToolbarItem>,
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
    <Toolbar>
      <ToolbarContent>
        {toolbarItems.concat([
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
