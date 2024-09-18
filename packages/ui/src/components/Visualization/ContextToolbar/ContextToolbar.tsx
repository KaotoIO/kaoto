import { Button, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { sourceSchemaConfig } from '../../../models/camel';
import { MetadataContext } from '../../../providers';
import { EntitiesContext } from '../../../providers/entities.provider';
import { isDefined } from '../../../utils';
import './ContextToolbar.scss';
import { DSLSelector } from './DSLSelector/DSLSelector';
import { FlowClipboard } from './FlowClipboard/FlowClipboard';
import { FlowExportImage } from './FlowExportImage/FlowExportImage';
import { FlowsMenu } from './Flows/FlowsMenu';
import { NewEntity } from './NewEntity/NewEntity';
import { RuntimeSelector } from './RuntimeSelector/RuntimeSelector';

export const ContextToolbar: FunctionComponent = () => {
  const { currentSchemaType } = useContext(EntitiesContext)!;
  const isMultipleRoutes = sourceSchemaConfig.config[currentSchemaType].multipleRoute;
  const metadataApi = useContext(MetadataContext);

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

  // TODO: Remove this block when the metadata API is implemented
  if (isDefined(metadataApi)) {
    toolbarItems.push(
      <ToolbarItem key="toolbar-get-metadata">
        <Button data-testid="toolbar-get-metadata" onClick={() => metadataApi.getMetadata('key')}>
          Get Metadata
        </Button>
      </ToolbarItem>,
    );
    toolbarItems.push(
      <ToolbarItem key="toolbar-set-metadata">
        <Button
          data-testid="toolbar-set-metadata"
          onClick={() => metadataApi.setMetadata('key', Date.now().toString())}
        >
          Set Metadata
        </Button>
      </ToolbarItem>,
    );
    toolbarItems.push(
      <ToolbarItem key="toolbar-get-content">
        <Button data-testid="toolbar-get-content" onClick={() => metadataApi.getResourceContent('file')}>
          Get Resource
        </Button>
      </ToolbarItem>,
    );
    toolbarItems.push(
      <ToolbarItem key="toolbar-save-content">
        <Button
          data-testid="toolbar-save-content"
          onClick={() => metadataApi.saveResourceContent('file', Date.now().toString())}
        >
          Save Resource
        </Button>
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
