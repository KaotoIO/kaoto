import { Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { sourceSchemaConfig, SourceSchemaType } from '../../../models/camel';
import { EntitiesContext } from '../../../providers/entities.provider';
import './ContextToolbar.scss';
import { DSLSelector } from './DSLSelector/DSLSelector';
import { FlowClipboard } from './FlowClipboard/FlowClipboard';
import { FlowExportImage } from './FlowExportImage/FlowExportImage';
import { FlowsMenu } from './Flows/FlowsMenu';
import { NewEntity } from './NewEntity/NewEntity';
import { RuntimeSelector } from './RuntimeSelector/RuntimeSelector';
import { SerializerSelector } from './SerializerSelector/SerializerSelector';

export const ContextToolbar: FunctionComponent = () => {
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
  if (currentSchemaType === SourceSchemaType.Route) {
    toolbarItems.unshift(
      <ToolbarItem key="toolbar-serializer-selector">
        <SerializerSelector />
      </ToolbarItem>,
    );
  }

  if (isMultipleRoutes) {
    toolbarItems.push(
      <ToolbarItem key="toolbar-new-route">
        <NewEntity />
      </ToolbarItem>,
    );
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

          <RuntimeSelector key="runtime-selector" />,
        ])}
      </ToolbarContent>
    </Toolbar>
  );
};
