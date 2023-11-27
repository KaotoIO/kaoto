import { ToolbarItem } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { sourceSchemaConfig } from '../../../models/camel';
import { EntitiesContext } from '../../../providers/entities.provider';
import './ContextToolbar.scss';
import { FlowClipboard } from './FlowClipboard/FlowClipboard';
import { FlowExportImage } from './FlowExportImage/FlowExportImage';
import { NewFlow } from './FlowType/NewFlow';
import { FlowsMenu } from './Flows/FlowsMenu';

export const ContextToolbar: FunctionComponent = () => {
  const { currentSchemaType } = useContext(EntitiesContext)!;

  return [
    <ToolbarItem className="current-dsl-tag" key="toolbar-current-dsl">
      <span data-testid="toolbar-current-dsl">{sourceSchemaConfig.config[currentSchemaType].name || 'None'}</span>
    </ToolbarItem>,
    <ToolbarItem key="toolbar-flows-list">
      <FlowsMenu />
    </ToolbarItem>,
    <ToolbarItem key="toolbar-new-route">
      <NewFlow />
    </ToolbarItem>,
    <ToolbarItem key="toolbar-clipboard">
      <FlowClipboard />
    </ToolbarItem>,
    <ToolbarItem key={'toolbar-export-image'}>
      <FlowExportImage />
    </ToolbarItem>,
  ];
};
